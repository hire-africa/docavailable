<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== USERS IN DATABASE ===\n";
echo "Total users: " . App\Models\User::count() . "\n\n";

$users = App\Models\User::orderBy('created_at', 'desc')->get();

foreach ($users as $user) {
    echo "ID: {$user->id}\n";
    echo "Name: {$user->display_name}\n";
    echo "Email: {$user->email}\n";
    echo "Type: {$user->user_type}\n";
    echo "Status: {$user->status}\n";
    echo "Created: {$user->created_at}\n";
    echo "---\n";
} 