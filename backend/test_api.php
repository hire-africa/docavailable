<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "Testing privacy settings API...\n";

// Set up authentication
$user = \App\Models\User::find(1);
if (!$user) {
    echo "User not found\n";
    exit;
}

// Mock the auth
\Auth::setUser($user);

// Create the controller
$controller = new \App\Http\Controllers\NotificationController();

// Call the method
$response = $controller->getPrivacySettings();
$data = $response->getData(true);

echo "API Response: " . json_encode($data, JSON_PRETTY_PRINT) . "\n";

if (isset($data['data']['privacy']['anonymousMode'])) {
    echo "Anonymous mode in API: " . ($data['data']['privacy']['anonymousMode'] ? 'true' : 'false') . "\n";
} else {
    echo "Anonymous mode in API: not set\n";
}
