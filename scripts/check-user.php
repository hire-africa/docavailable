<?php

require_once __DIR__ . '/../backend/vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;

echo "Searching for user with name 'Praise Mtosa'...\n\n";

// Search for users with names containing "praise" or "mtosa" (case insensitive)
$users = User::where(function($query) {
    $query->whereRaw('LOWER(first_name) LIKE ?', ['%praise%'])
          ->orWhereRaw('LOWER(last_name) LIKE ?', ['%praise%'])
          ->orWhereRaw('LOWER(first_name) LIKE ?', ['%mtosa%'])
          ->orWhereRaw('LOWER(last_name) LIKE ?', ['%mtosa%'])
          ->orWhereRaw('LOWER(display_name) LIKE ?', ['%praise%'])
          ->orWhereRaw('LOWER(display_name) LIKE ?', ['%mtosa%']);
})->get();

if ($users->count() > 0) {
    echo "Found " . $users->count() . " user(s):\n";
    echo str_repeat("-", 80) . "\n";
    
    foreach ($users as $user) {
        echo "ID: " . $user->id . "\n";
        echo "Name: " . $user->display_name . "\n";
        echo "First Name: " . $user->first_name . "\n";
        echo "Last Name: " . $user->last_name . "\n";
        echo "Email: " . $user->email . "\n";
        echo "User Type: " . $user->user_type . "\n";
        echo "Status: " . $user->status . "\n";
        echo "Created: " . $user->created_at . "\n";
        echo "Updated: " . $user->updated_at . "\n";
        echo str_repeat("-", 80) . "\n";
    }
} else {
    echo "❌ No user found with name containing 'Praise' or 'Mtosa'\n\n";
    
    // Let's also show all users to see what we have
    echo "All users in database:\n";
    echo str_repeat("-", 80) . "\n";
    
    $allUsers = User::orderBy('created_at', 'desc')->get();
    
    if ($allUsers->count() > 0) {
        foreach ($allUsers as $user) {
            echo "ID: " . $user->id . " | Name: " . $user->display_name . " | Email: " . $user->email . " | Type: " . $user->user_type . " | Created: " . $user->created_at . "\n";
        }
    } else {
        echo "No users found in database.\n";
    }
}

echo "\nSearch completed.\n"; 