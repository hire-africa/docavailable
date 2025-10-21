<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "Testing privacy preferences...\n";

$user = \App\Models\User::find(1);
if ($user) {
    echo "User found: Yes\n";
    echo "Privacy preferences: " . json_encode($user->privacy_preferences) . "\n";
    echo "Type: " . gettype($user->privacy_preferences) . "\n";
    
    if (is_array($user->privacy_preferences)) {
        echo "Is array: Yes\n";
        if (isset($user->privacy_preferences['privacy']['anonymousMode'])) {
            echo "Anonymous mode: " . ($user->privacy_preferences['privacy']['anonymousMode'] ? 'true' : 'false') . "\n";
        } else {
            echo "Anonymous mode: not set\n";
        }
    } else {
        echo "Is array: No\n";
    }
} else {
    echo "User not found\n";
}
