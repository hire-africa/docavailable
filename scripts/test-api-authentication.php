<?php

require_once __DIR__ . '/../backend/vendor/autoload.php';

use App\Models\User;
use App\Models\DoctorAvailability;
use App\Models\DoctorWallet;

// Bootstrap Laravel
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔍 Testing API Authentication and Endpoints\n";
echo "===========================================\n\n";

// 1. Test if we can access the API without authentication
echo "1. Testing API Access Without Authentication\n";
echo "--------------------------------------------\n";

$testUrl = 'http://172.20.10.11:8000/api/doctors/58/availability';
echo "Testing URL: {$testUrl}\n";

$context = stream_context_create([
    'http' => [
        'method' => 'GET',
        'header' => [
            'Accept: application/json',
            'Content-Type: application/json',
        ],
    ],
]);

$response = file_get_contents($testUrl, false, $context);
$httpCode = $http_response_header[0] ?? 'Unknown';

echo "HTTP Response Code: {$httpCode}\n";
echo "Response (first 500 chars): " . substr($response, 0, 500) . "\n\n";

// 2. Test with a valid doctor token
echo "2. Testing API Access With Authentication\n";
echo "-----------------------------------------\n";

// Get a doctor user
$doctor = User::where('user_type', 'doctor')->first();

if ($doctor) {
    echo "Found doctor: {$doctor->display_name} (ID: {$doctor->id})\n";
    
    // Generate a token for this doctor
    $token = auth()->login($doctor);
    echo "Generated token: " . substr($token, 0, 50) . "...\n\n";
    
    // Test the availability endpoint with authentication
    $testUrlWithAuth = 'http://172.20.10.11:8000/api/doctors/' . $doctor->id . '/availability';
    echo "Testing authenticated URL: {$testUrlWithAuth}\n";
    
    $contextWithAuth = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => [
                'Accept: application/json',
                'Content-Type: application/json',
                'Authorization: Bearer ' . $token,
            ],
        ],
    ]);
    
    $responseWithAuth = file_get_contents($testUrlWithAuth, false, $contextWithAuth);
    $httpCodeWithAuth = $http_response_header[0] ?? 'Unknown';
    
    echo "HTTP Response Code: {$httpCodeWithAuth}\n";
    echo "Response (first 500 chars): " . substr($responseWithAuth, 0, 500) . "\n\n";
    
    // Test the wallet endpoint
    $walletUrl = 'http://172.20.10.11:8000/api/doctor/wallet';
    echo "Testing wallet URL: {$walletUrl}\n";
    
    $walletResponse = file_get_contents($walletUrl, false, $contextWithAuth);
    $walletHttpCode = $http_response_header[0] ?? 'Unknown';
    
    echo "HTTP Response Code: {$walletHttpCode}\n";
    echo "Response (first 500 chars): " . substr($walletResponse, 0, 500) . "\n\n";
    
} else {
    echo "No doctor users found!\n";
}

// 3. Test the actual API controller directly
echo "3. Testing API Controller Directly\n";
echo "----------------------------------\n";

if ($doctor) {
    // Test the availability controller method directly
    $controller = new \App\Http\Controllers\DoctorController();
    $request = new \Illuminate\Http\Request();
    
    // Set the authenticated user
    auth()->setUser($doctor);
    
    try {
        $response = $controller->getAvailability($doctor->id);
        echo "Controller response: " . json_encode($response->getData(), JSON_PRETTY_PRINT) . "\n\n";
    } catch (Exception $e) {
        echo "Controller error: " . $e->getMessage() . "\n\n";
    }
}

echo "✅ API Authentication Testing Complete!\n"; 