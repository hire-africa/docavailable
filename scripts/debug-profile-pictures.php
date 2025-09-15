<?php

require_once __DIR__ . '/../vendor/autoload.php';

// Test the buildImageUrl function
function buildImageUrl(?string $value): ?string
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
            return "https://docavailable-1.onrender.com/api/images/{$relative}";
        }
        // Otherwise assume it's already a public URL (e.g., external CDN)
        return $value;
    }

    // If a relative path is provided
    $path = ltrim($value, '/');
    if (str_starts_with($path, 'storage/')) {
        $path = substr($path, strlen('storage/'));
    }
    return "https://docavailable-1.onrender.com/api/images/{$path}";
}

// Test cases
$testPaths = [
    'profile-pictures/df39fc60-4486-4db9-8db3-28696190a1f4.jpg',
    'profile_pictures/test.jpg',
    'https://docavailable-1.onrender.com/storage/profile-pictures/test.jpg',
    'storage/profile-pictures/test.jpg',
    '/storage/profile-pictures/test.jpg'
];

echo "Testing image URL generation:\n";
echo "=============================\n\n";

foreach ($testPaths as $path) {
    $url = buildImageUrl($path);
    echo "Input:  {$path}\n";
    echo "Output: {$url}\n";
    echo "---\n";
}

// Test if the specific file exists in storage
$storagePath = __DIR__ . '/../backend/storage/app/public/profile-pictures/df39fc60-4486-4db9-8db3-28696190a1f4.jpg';
echo "\nChecking if file exists:\n";
echo "Storage path: {$storagePath}\n";
echo "Exists: " . (file_exists($storagePath) ? 'YES' : 'NO') . "\n";

if (file_exists($storagePath)) {
    echo "File size: " . filesize($storagePath) . " bytes\n";
    echo "File permissions: " . substr(sprintf('%o', fileperms($storagePath)), -4) . "\n";
}

// Check storage directory structure
$storageDir = __DIR__ . '/../backend/storage/app/public/';
echo "\nStorage directory contents:\n";
if (is_dir($storageDir)) {
    $files = scandir($storageDir);
    foreach ($files as $file) {
        if ($file !== '.' && $file !== '..') {
            $fullPath = $storageDir . $file;
            if (is_dir($fullPath)) {
                echo "DIR:  {$file}\n";
                $subFiles = scandir($fullPath);
                foreach ($subFiles as $subFile) {
                    if ($subFile !== '.' && $subFile !== '..') {
                        echo "  - {$subFile}\n";
                    }
                }
            } else {
                echo "FILE: {$file}\n";
            }
        }
    }
} else {
    echo "Storage directory does not exist: {$storageDir}\n";
}
