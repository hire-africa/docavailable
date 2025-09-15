<?php

require_once __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;

echo "👥 Users in database:\n";

$users = User::all(['id', 'email', 'user_type', 'first_name', 'last_name']);

foreach ($users as $user) {
    echo "ID: {$user->id} | Email: {$user->email} | Type: {$user->user_type} | Name: {$user->first_name} {$user->last_name}\n";
}

echo "\nTotal users: " . $users->count() . "\n";

