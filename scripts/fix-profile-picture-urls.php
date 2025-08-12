<?php

require_once __DIR__ . '/../backend/vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\DB;

echo "Fixing profile picture URLs...\n";
echo "==============================\n\n";

// Get all users with profile pictures
$users = User::whereNotNull('profile_picture')->get();

$fixed = 0;
$skipped = 0;

foreach ($users as $user) {
    $originalPath = $user->profile_picture;
    
    // Check if it's already a relative path
    if (!filter_var($originalPath, FILTER_VALIDATE_URL)) {
        echo "User {$user->id}: Already has relative path '{$originalPath}' - SKIPPED\n";
        $skipped++;
        continue;
    }
    
    // Extract relative path from full URL
    $parsedUrl = parse_url($originalPath);
    $path = $parsedUrl['path'] ?? '';
    
    // Remove /storage/ prefix if present
    if (str_starts_with($path, '/storage/')) {
        $relativePath = substr($path, strlen('/storage/'));
    } else {
        $relativePath = ltrim($path, '/');
    }
    
    // Update the user
    $user->profile_picture = $relativePath;
    $user->save();
    
    echo "User {$user->id}: Fixed '{$originalPath}' -> '{$relativePath}'\n";
    $fixed++;
}

echo "\nSummary:\n";
echo "Fixed: {$fixed} users\n";
echo "Skipped: {$skipped} users\n";
echo "Total processed: " . ($fixed + $skipped) . " users\n";

// Test URL generation for a few users
echo "\nTesting URL generation:\n";
echo "=======================\n";

$testUsers = User::whereNotNull('profile_picture')->limit(3)->get();
foreach ($testUsers as $user) {
    $url = $user->profile_picture_url;
    echo "User {$user->id}: '{$user->profile_picture}' -> '{$url}'\n";
}

echo "\nDone!\n";

