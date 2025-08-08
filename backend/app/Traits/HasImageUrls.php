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
        
        $toUrl = function ($val) {
            if (!$val) {
                return null;
            }
            if (str_starts_with($val, 'http://') || str_starts_with($val, 'https://')) {
                return $val;
            }
            return Storage::disk('public')->url($val);
        };
        
        if ($user->profile_picture) {
            $userData['profile_picture_url'] = $toUrl($user->profile_picture);
        }
        if ($user->national_id) {
            $userData['national_id_url'] = $toUrl($user->national_id);
        }
        if ($user->medical_degree) {
            $userData['medical_degree_url'] = $toUrl($user->medical_degree);
        }
        if ($user->medical_licence) {
            $userData['medical_licence_url'] = $toUrl($user->medical_licence);
        }
        
        return $userData;
    }
} 