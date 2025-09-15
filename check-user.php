<?php

require_once __DIR__ . '/vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;

echo "🔍 Searching for user with name 'Praise Mtosa'...\n\n";

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
    echo "✅ Found " . $users->count() . " user(s) matching 'Praise Mtosa':\n";
    echo str_repeat("=", 80) . "\n";
    
    foreach ($users as $user) {
        echo "🆔 ID: " . $user->id . "\n";
        echo "👤 Name: " . $user->display_name . "\n";
        echo "📧 Email: " . $user->email . "\n";
        echo "👥 User Type: " . $user->user_type . "\n";
        echo "📊 Status: " . $user->status . "\n";
        echo "📅 Created: " . $user->created_at . "\n";
        echo str_repeat("-", 80) . "\n";
    }
} else {
    echo "❌ No user found with name containing 'Praise' or 'Mtosa'\n\n";
    
    // Let's also show the most recent users to see what we have
    echo "📋 Recent users in database (last 10):\n";
    echo str_repeat("=", 80) . "\n";
    
    $recentUsers = User::orderBy('created_at', 'desc')->limit(10)->get();
    
    if ($recentUsers->count() > 0) {
        foreach ($recentUsers as $user) {
            echo "ID: " . $user->id . " | " . $user->display_name . " | " . $user->email . " | " . $user->user_type . " | " . $user->created_at->format('Y-m-d H:i:s') . "\n";
        }
    } else {
        echo "No users found in database.\n";
    }
}

echo "\n🏁 Search completed.\n"; 