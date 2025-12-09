<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class AudioFileMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Check if this is an audio file request
        $path = $request->path();
        if (str_contains($path, 'storage/chat_voice_messages') || 
            str_contains($path, 'storage/') && $this->isAudioFile($path)) {
            
            // Set proper headers for audio streaming
            $response->headers->set('Content-Type', $this->getAudioMimeType($path));
            $response->headers->set('Accept-Ranges', 'bytes');
            $response->headers->set('Cache-Control', 'public, max-age=31536000');
            $response->headers->set('Access-Control-Allow-Origin', '*');
            $response->headers->set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
            $response->headers->set('Access-Control-Allow-Headers', 'Range, Accept-Ranges, Content-Range');
            
            // Handle range requests for audio streaming
            if ($request->header('Range')) {
                return $this->handleRangeRequest($request, $response);
            }
        }

        return $response;
    }

    /**
     * Check if the file is an audio file
     */
    private function isAudioFile(string $path): bool
    {
        $extension = pathinfo($path, PATHINFO_EXTENSION);
        return in_array(strtolower($extension), ['m4a', 'mp3', 'wav', 'aac', 'ogg']);
    }

    /**
     * Get the MIME type for audio files
     */
    private function getAudioMimeType(string $path): string
    {
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        
        $mimeTypes = [
            'm4a' => 'audio/mp4',
            'mp3' => 'audio/mpeg',
            'wav' => 'audio/wav',
            'aac' => 'audio/aac',
            'ogg' => 'audio/ogg',
        ];

        return $mimeTypes[$extension] ?? 'audio/mpeg';
    }

    /**
     * Handle range requests for audio streaming
     */
    private function handleRangeRequest(Request $request, Response $response): Response
    {
        $range = $request->header('Range');
        if (!$range) {
            return $response;
        }

        // Parse range header (e.g., "bytes=0-1023")
        if (preg_match('/bytes=(\d+)-(\d*)/', $range, $matches)) {
            $start = (int) $matches[1];
            $end = !empty($matches[2]) ? (int) $matches[2] : null;
            
            // Get file size
            $filePath = public_path(str_replace('/storage/', 'storage/app/public/', $request->path()));
            if (file_exists($filePath)) {
                $fileSize = filesize($filePath);
                $end = $end ?? ($fileSize - 1);
                $length = $end - $start + 1;
                
                // Set range response headers
                $response->setStatusCode(206);
                $response->headers->set('Content-Range', "bytes $start-$end/$fileSize");
                $response->headers->set('Content-Length', $length);
                
                // Read and return the requested range
                $handle = fopen($filePath, 'rb');
                fseek($handle, $start);
                $content = fread($handle, $length);
                fclose($handle);
                
                $response->setContent($content);
            }
        }

        return $response;
    }
} 