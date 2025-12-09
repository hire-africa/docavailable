<?php

require_once __DIR__ . '/../vendor/autoload.php';

// Initialize Laravel
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

echo "Checking profile pictures in database...\n";
echo "=====================================\n\n";

// Get all users with profile pictures
$users = DB::table('users')
    ->whereNotNull('profile_picture')
    ->where('profile_picture', '!=', '')
    ->select('id', 'email', 'profile_picture')
    ->get();

echo "Found " . $users->count() . " users with profile pictures:\n\n";

foreach ($users as $user) {
    echo "User ID: {$user->id}\n";
    echo "Email: {$user->email}\n";
    echo "Profile Picture: {$user->profile_picture}\n";
    
    // Check if file exists
    $exists = Storage::disk('public')->exists($user->profile_picture);
    echo "File exists: " . ($exists ? 'YES' : 'NO') . "\n";
    
    if (!$exists) {
        // Try to find the file in different locations
        $possiblePaths = [
            $user->profile_picture,
            str_replace('profile-pictures/', 'profile_pictures/', $user->profile_picture),
            str_replace('profile_pictures/', 'profile-pictures/', $user->profile_picture),
        ];
        
        $found = false;
        foreach ($possiblePaths as $path) {
            if (Storage::disk('public')->exists($path)) {
                echo "Found file at: {$path}\n";
                echo "Updating database...\n";
                
                // Update the database with the correct path
                DB::table('users')
                    ->where('id', $user->id)
                    ->update(['profile_picture' => $path]);
                
                $found = true;
                break;
            }
        }
        
        if (!$found) {
            echo "File not found in any location. Clearing profile picture.\n";
            DB::table('users')
                ->where('id', $user->id)
                ->update(['profile_picture' => null]);
        }
    }
    
    echo "---\n";
}

echo "\nChecking available profile pictures in storage:\n";
echo "===============================================\n";

// List all profile pictures in storage
$profilePictures = Storage::disk('public')->files('profile-pictures');
$profilePictures2 = Storage::disk('public')->files('profile_pictures');

echo "In profile-pictures/:\n";
foreach ($profilePictures as $file) {
    echo "  - {$file}\n";
}

echo "\nIn profile_pictures/:\n";
foreach ($profilePictures2 as $file) {
    echo "  - {$file}\n";
}

echo "\nDone!\n";
