<?php

require_once __DIR__ . '/../backend/vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;

echo "Testing Image URL Generation...\n";
echo "==============================\n\n";

// Get users with profile pictures
$users = User::whereNotNull('profile_picture')->limit(5)->get();

foreach ($users as $user) {
    echo "User ID: {$user->id}\n";
    echo "Email: {$user->email}\n";
    echo "Profile Picture Path: {$user->profile_picture}\n";
    echo "Profile Picture URL: {$user->profile_picture_url}\n";
    echo "---\n";
}

echo "\nTesting URL Generation for Specific Paths:\n";
echo "===========================================\n";

$testPaths = [
    'profile-pictures/doctor1.jpg',
    'profile-pictures/doctor2.jpg',
    'profile-pictures/doctor3.jpg',
    'profile_pictures/7ozZu3f484bgGpNa4OVwR7jQtJRSw6rl7osEMJrt.jpg'
];

foreach ($testPaths as $path) {
    $url = "https://docavailable-1.onrender.com/api/images/{$path}";
    echo "Path: {$path}\n";
    echo "URL: {$url}\n";
    echo "---\n";
}

echo "\nDone!\n";

