<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class BlogFeedController extends Controller
{
    /**
     * Curated external sources. We only return metadata + link to the original article.
     * This avoids copying/publishing third-party copyrighted content in our app.
     */
    private const FEEDS = [
        [
            'source' => 'WHO News',
            'url' => 'https://www.who.int/rss-feeds/news-english.xml',
        ],
        // Add more sources here if desired (keep to trusted/public feeds).
    ];

    public function feed(Request $request)
    {
        $limit = (int) $request->query('limit', 20);
        $limit = max(1, min($limit, 50));

        $cacheKey = "blog_feed:v1:limit:{$limit}";
        $cached = Cache::get($cacheKey);

        // If PHP XML extensions are missing, don't pretend this worked.
        if (!function_exists('simplexml_load_string')) {
            return response()->json([
                'success' => false,
                'message' => 'RSS parsing is not available on the server (missing PHP XML extensions).',
                'data' => [
                    'articles' => [],
                    'meta' => [
                        'sources' => array_map(fn ($f) => $f['source'], self::FEEDS),
                    ],
                ],
            ], 200);
        }

        $combined = [];
        foreach (self::FEEDS as $feed) {
            $combined = array_merge($combined, $this->fetchRss($feed['url'], $feed['source']));
        }

        usort($combined, function ($a, $b) {
            return strcmp($b['publishedAt'] ?? '', $a['publishedAt'] ?? '');
        });

        $articles = array_slice($combined, 0, $limit);

        // If the fetch/parsing failed and we have cached content, serve stale instead of empty.
        if (empty($articles) && is_array($cached) && !empty($cached)) {
            return response()->json([
                'success' => true,
                'message' => 'OK (stale cache)',
                'data' => [
                    'articles' => $cached,
                    'meta' => [
                        'stale' => true,
                        'sources' => array_map(fn ($f) => $f['source'], self::FEEDS),
                    ],
                ],
            ]);
        }

        // Cache only non-empty results to avoid "empty cache for 10 minutes" after transient failures.
        if (!empty($articles)) {
            Cache::put($cacheKey, $articles, 600);
        }

        return response()->json([
            'success' => !empty($articles),
            'message' => !empty($articles) ? 'OK' : 'No web articles available right now.',
            'data' => [
                'articles' => $articles,
                'meta' => [
                    'sources' => array_map(fn ($f) => $f['source'], self::FEEDS),
                    'count' => count($articles),
                ],
            ],
        ], 200);
    }

    private function fetchRss(string $url, string $source): array
    {
        try {
            $response = Http::timeout(12)
                ->retry(2, 250)
                ->withHeaders([
                    // Some feeds are picky about UA.
                    'User-Agent' => 'DocAvailable/1.0 (+https://docavailable.com)',
                    'Accept' => 'application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5',
                ])
                ->get($url);

            if (!$response->successful()) {
                return [];
            }

            $body = (string) $response->body();
            if (trim($body) === '') {
                return [];
            }

            libxml_use_internal_errors(true);
            $xml = simplexml_load_string($body, 'SimpleXMLElement', LIBXML_NOCDATA);
            if (!$xml) {
                return [];
            }

            // RSS 2.0: <rss><channel><item>...</item></channel></rss>
            if (isset($xml->channel) && isset($xml->channel->item)) {
                $items = $xml->channel->item;
                $out = [];
                foreach ($items as $item) {
                    $out[] = $this->mapRssItem($item, $source);
                }
                return array_values(array_filter($out));
            }

            // Atom: <feed><entry>...</entry></feed>
            if (isset($xml->entry)) {
                $out = [];
                foreach ($xml->entry as $entry) {
                    $out[] = $this->mapAtomEntry($entry, $source);
                }
                return array_values(array_filter($out));
            }
        } catch (\Throwable $t) {
            // Fail closed: return empty list.
        }

        return [];
    }

    private function mapRssItem(\SimpleXMLElement $item, string $source): ?array
    {
        $title = trim((string) ($item->title ?? ''));
        $link = trim((string) ($item->link ?? ''));
        $pubDate = trim((string) ($item->pubDate ?? ''));
        $descriptionRaw = (string) ($item->description ?? '');

        if ($title === '' || $link === '') {
            return null;
        }

        $publishedAt = $this->toIsoDate($pubDate);
        $description = $this->excerpt($descriptionRaw, 220);

        $imageUrl = $this->extractRssImageUrl($item);

        return [
            'id' => substr(sha1($link), 0, 16),
            'source' => $source,
            'title' => $title,
            'url' => $link,
            'publishedAt' => $publishedAt,
            'description' => $description,
            'imageUrl' => $imageUrl,
        ];
    }

    private function mapAtomEntry(\SimpleXMLElement $entry, string $source): ?array
    {
        $title = trim((string) ($entry->title ?? ''));

        // Atom links can be attributes.
        $link = '';
        if (isset($entry->link)) {
            foreach ($entry->link as $l) {
                $href = (string) ($l['href'] ?? '');
                $rel = (string) ($l['rel'] ?? '');
                if ($href && ($rel === '' || $rel === 'alternate')) {
                    $link = $href;
                    break;
                }
            }
        }

        $updated = trim((string) ($entry->updated ?? ''));
        $summaryRaw = (string) ($entry->summary ?? ($entry->content ?? ''));

        if ($title === '' || $link === '') {
            return null;
        }

        $publishedAt = $this->toIsoDate($updated);
        $description = $this->excerpt($summaryRaw, 220);
        
        // Try to extract image from Atom entry
        $imageUrl = $this->extractAtomImageUrl($entry, $summaryRaw);

        return [
            'id' => substr(sha1($link), 0, 16),
            'source' => $source,
            'title' => $title,
            'url' => $link,
            'publishedAt' => $publishedAt,
            'description' => $description,
            'imageUrl' => $imageUrl,
        ];
    }

    private function toIsoDate(string $date): ?string
    {
        if (trim($date) === '') {
            return null;
        }

        try {
            return (new \DateTime($date))->format(\DateTime::ATOM);
        } catch (\Throwable $t) {
            return null;
        }
    }

    private function excerpt(string $html, int $maxLen): string
    {
        $text = trim(strip_tags($html));
        $text = preg_replace('/\s+/', ' ', $text) ?: '';
        if (Str::length($text) <= $maxLen) {
            return $text;
        }
        return Str::limit($text, $maxLen);
    }

    private function extractRssImageUrl(\SimpleXMLElement $item): ?string
    {
        // <enclosure url="..." type="image/jpeg" />
        if (isset($item->enclosure)) {
            foreach ($item->enclosure as $enc) {
                $url = (string) ($enc['url'] ?? '');
                $type = (string) ($enc['type'] ?? '');
                if ($url && (str_starts_with($type, 'image/') || preg_match('/\.(png|jpg|jpeg|webp)(\?.*)?$/i', $url))) {
                    return $url;
                }
            }
        }

        // media namespace
        $media = $item->children('media', true);
        if ($media) {
            if (isset($media->content)) {
                foreach ($media->content as $content) {
                    $url = (string) ($content['url'] ?? '');
                    if ($url) return $url;
                }
            }
            if (isset($media->thumbnail)) {
                foreach ($media->thumbnail as $thumb) {
                    $url = (string) ($thumb['url'] ?? '');
                    if ($url) return $url;
                }
            }
        }

        // Extract image from description HTML (common in RSS feeds like WHO)
        $description = (string) ($item->description ?? '');
        if ($description) {
            // Look for <img src="..." /> tags
            if (preg_match('/<img[^>]+src=["\']([^"\']+)["\']/i', $description, $matches)) {
                $imgUrl = trim($matches[1]);
                // Validate it's a proper image URL
                if ($imgUrl && (str_starts_with($imgUrl, 'http') || str_starts_with($imgUrl, '//'))) {
                    // Convert protocol-relative URLs to HTTPS
                    if (str_starts_with($imgUrl, '//')) {
                        $imgUrl = 'https:' . $imgUrl;
                    }
                    return $imgUrl;
                }
            }
            // Also check for CDATA wrapped content
            if (preg_match('/<!\[CDATA\[.*?<img[^>]+src=["\']([^"\']+)["\'].*?\]\]>/is', $description, $matches)) {
                $imgUrl = trim($matches[1]);
                if ($imgUrl && (str_starts_with($imgUrl, 'http') || str_starts_with($imgUrl, '//'))) {
                    if (str_starts_with($imgUrl, '//')) {
                        $imgUrl = 'https:' . $imgUrl;
                    }
                    return $imgUrl;
                }
            }
        }

        // Check content:encoded (some feeds use this)
        $namespaces = $item->getNamespaces(true);
        foreach ($namespaces as $prefix => $ns) {
            $content = $item->children($ns, true);
            if (isset($content->encoded)) {
                $encoded = (string) $content->encoded;
                if (preg_match('/<img[^>]+src=["\']([^"\']+)["\']/i', $encoded, $matches)) {
                    $imgUrl = trim($matches[1]);
                    if ($imgUrl && (str_starts_with($imgUrl, 'http') || str_starts_with($imgUrl, '//'))) {
                        if (str_starts_with($imgUrl, '//')) {
                            $imgUrl = 'https:' . $imgUrl;
                        }
                        return $imgUrl;
                    }
                }
            }
        }

        return null;
    }

    private function extractAtomImageUrl(\SimpleXMLElement $entry, string $summaryOrContent): ?string
    {
        // Check media namespace (similar to RSS)
        $media = $entry->children('media', true);
        if ($media) {
            if (isset($media->content)) {
                foreach ($media->content as $content) {
                    $url = (string) ($content['url'] ?? '');
                    if ($url) return $url;
                }
            }
            if (isset($media->thumbnail)) {
                foreach ($media->thumbnail as $thumb) {
                    $url = (string) ($thumb['url'] ?? '');
                    if ($url) return $url;
                }
            }
        }

        // Extract from summary/content HTML
        if ($summaryOrContent) {
            if (preg_match('/<img[^>]+src=["\']([^"\']+)["\']/i', $summaryOrContent, $matches)) {
                $imgUrl = trim($matches[1]);
                if ($imgUrl && (str_starts_with($imgUrl, 'http') || str_starts_with($imgUrl, '//'))) {
                    if (str_starts_with($imgUrl, '//')) {
                        $imgUrl = 'https:' . $imgUrl;
                    }
                    return $imgUrl;
                }
            }
        }

        return null;
    }
}


