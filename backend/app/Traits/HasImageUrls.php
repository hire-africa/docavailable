<?php

namespace App\Traits;

use Illuminate\Support\Facades\Storage;

trait HasImageUrls
{
    /**
     * Normalize any stored image reference to a public /api/images URL.
     */
    protected function buildImageUrl(?string $value): ?string
    {
        if (empty($value)) {
            return null;
        }

        // If a full URL is provided
        if (filter_var($value, FILTER_VALIDATE_URL)) {
            // If it points to /storage/... convert it to /api/images/...
            $path = ltrim(parse_url($value, PHP_URL_PATH) ?? '', '/');
            if (str_starts_with($path, 'storage/')) {
                $relative = substr($path, strlen('storage/'));
                return config('app.url') . "/api/images/{$relative}";
            }
            // Otherwise assume it's already a public URL (e.g., external CDN)
            return $value;
        }

        // If a relative path is provided
        $path = ltrim($value, '/');
        if (str_starts_with($path, 'storage/')) {
            $path = substr($path, strlen('storage/'));
        }
        // Use dynamic app URL for image URLs
        return config('app.url') . "/api/images/{$path}";
    }

    /**
     * Generate full URLs for user images
     */
    protected function generateImageUrls($user): array
    {
        $userData = $user->toArray();
        
        if ($user->profile_picture) {
            $userData['profile_picture_url'] = $this->buildImageUrl($user->profile_picture);
        }
        
        // For private documents, we don't generate direct URLs
        // Instead, we indicate they exist and require a secure endpoint
        if ($user->national_id) {
            $userData['national_id_exists'] = true;
            $userData['national_id_url'] = null; // Will be generated via secure endpoint
        }
        if ($user->medical_degree) {
            $userData['medical_degree_exists'] = true;
            $userData['medical_degree_url'] = null; // Will be generated via secure endpoint
        }
        if ($user->medical_licence) {
            $userData['medical_licence_exists'] = true;
            $userData['medical_licence_url'] = null; // Will be generated via secure endpoint
        }
        
        return $userData;
    }
} 