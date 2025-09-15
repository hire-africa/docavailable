<?php

require_once __DIR__ . '/../backend/vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\Storage;

echo "Checking storage files...\n";
echo "=======================\n\n";

// Check profile-pictures directory
echo "Profile Pictures Directory:\n";
echo "---------------------------\n";
try {
    $profilePictures = Storage::disk('public')->files('profile-pictures');
    if (empty($profilePictures)) {
        echo "No files found in profile-pictures directory\n";
    } else {
        foreach ($profilePictures as $file) {
            echo "- {$file}\n";
        }
    }
} catch (Exception $e) {
    echo "Error accessing profile-pictures: " . $e->getMessage() . "\n";
}

echo "\nProfile Pictures Directory (with underscore):\n";
echo "---------------------------------------------\n";
try {
    $profilePicturesUnderscore = Storage::disk('public')->files('profile_pictures');
    if (empty($profilePicturesUnderscore)) {
        echo "No files found in profile_pictures directory\n";
    } else {
        foreach ($profilePicturesUnderscore as $file) {
            echo "- {$file}\n";
        }
    }
} catch (Exception $e) {
    echo "Error accessing profile_pictures: " . $e->getMessage() . "\n";
}

echo "\nAll Storage Files:\n";
echo "------------------\n";
try {
    $allFiles = Storage::disk('public')->allFiles();
    if (empty($allFiles)) {
        echo "No files found in storage\n";
    } else {
        foreach ($allFiles as $file) {
            echo "- {$file}\n";
        }
    }
} catch (Exception $e) {
    echo "Error accessing storage: " . $e->getMessage() . "\n";
}

echo "\nStorage Configuration:\n";
echo "----------------------\n";
echo "Default disk: " . config('filesystems.default') . "\n";
echo "Public disk driver: " . config('filesystems.disks.public.driver') . "\n";
echo "Public disk root: " . config('filesystems.disks.public.root') . "\n";
echo "Public disk url: " . config('filesystems.disks.public.url') . "\n";

echo "\nDone!\n";

