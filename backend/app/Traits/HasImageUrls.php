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
        
        if ($user->profile_picture) {
            $userData['profile_picture_url'] = $user->profile_picture;
        }
        if ($user->national_id) {
            $userData['national_id_url'] = $user->national_id;
        }
        if ($user->medical_degree) {
            $userData['medical_degree_url'] = $user->medical_degree;
        }
        if ($user->medical_licence) {
            $userData['medical_licence_url'] = $user->medical_licence;
        }
        
        return $userData;
    }
} 