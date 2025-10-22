<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "Testing chat info API...\n";

// Set up authentication
$user = \App\Models\User::find(1); // Patient user
if (!$user) {
    echo "User not found\n";
    exit;
}

// Mock the auth
\Auth::setUser($user);

// Create the controller
$controller = new \App\Http\Controllers\ChatController(
    new \App\Services\MessageStorageService(),
    new \App\Services\AnonymizationService()
);

// Test with text session ID
$appointmentId = 'text_session_97'; // Use the session ID from the logs
echo "Testing with appointment ID: $appointmentId\n";

// Call the method
$response = $controller->getChatInfo($appointmentId);
$data = $response->getData(true);

echo "Chat Info API Response: " . json_encode($data, JSON_PRETTY_PRINT) . "\n";

if (isset($data['data']['other_participant_name'])) {
    echo "Other participant name: " . $data['data']['other_participant_name'] . "\n";
} else {
    echo "Other participant name not found in response\n";
}

if (isset($data['data']['other_participant_profile_picture_url'])) {
    echo "Other participant profile picture: " . $data['data']['other_participant_profile_picture_url'] . "\n";
} else {
    echo "Other participant profile picture not found in response\n";
}
?>
