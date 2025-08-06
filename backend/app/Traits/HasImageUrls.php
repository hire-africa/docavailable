<?php

namespace App\Traits;

use Illuminate\Support\Facades\Storage;

trait HasImageUrls
{
    /**
     * Generate full URLs for user images
     */
    protected function generateImageUrls($user): array
    {
        $userData = $user->toArray();
        $baseUrl = env('APP_URL', 'http://172.20.10.11:8000');
        
        if ($user->profile_picture) {
            $userData['profile_picture_url'] = $baseUrl . '/storage/' . $user->profile_picture;
        }
        if ($user->national_id) {
            $userData['national_id_url'] = $baseUrl . '/storage/' . $user->national_id;
        }
        if ($user->medical_degree) {
            $userData['medical_degree_url'] = $baseUrl . '/storage/' . $user->medical_degree;
        }
        if ($user->medical_licence) {
            $userData['medical_licence_url'] = $baseUrl . '/storage/' . $user->medical_licence;
        }
        
        return $userData;
    }
} 