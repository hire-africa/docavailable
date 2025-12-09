<?php

// Comprehensive test for call session issues
$apiUrl = 'https://docavailable-3vbdv.ondigitalocean.app/api';

// Test 1: Check if backend has new code by testing call-sessions endpoint
echo "=== TEST 1: Backend Code Version Check ===\n";
$testCallSessions = $apiUrl . '/call-sessions/start';
$testData = [
    'call_type' => 'voice',
    'appointment_id' => 'test_direct_session_' . time(),
    'doctor_id' => 1,
    'reason' => 'Test call session'
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $testCallSessions);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($testData));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Call Sessions API Response:\n";
echo "HTTP Code: $httpCode\n";
echo "Response: $response\n\n";

// Test 2: Check text sessions endpoint
echo "=== TEST 2: Text Sessions Check ===\n";
$testTextSessions = $apiUrl . '/text-sessions/active';
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $testTextSessions);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Text Sessions API Response:\n";
echo "HTTP Code: $httpCode\n";
echo "Response: $response\n\n";

// Test 3: Check if call-sessions endpoint exists
echo "=== TEST 3: Endpoint Existence Check ===\n";
$testEndpoints = [
    '/call-sessions/start',
    '/call-sessions/check-availability',
    '/call-sessions/end',
    '/text-sessions/start',
    '/text-sessions/active'
];

foreach ($testEndpoints as $endpoint) {
    $testUrl = $apiUrl . $endpoint;
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $testUrl);
    curl_setopt($ch, CURLOPT_NOBODY, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    echo "Endpoint: $endpoint - HTTP Code: $httpCode\n";
}

echo "\n=== ANALYSIS ===\n";
if (strpos($response, 'Doctor ID is required') !== false) {
    echo "✅ Backend has NEW code (updated CallSessionController)\n";
} else if (strpos($response, 'Invalid call type') !== false) {
    echo "✅ Backend has NEW code (updated CallSessionController)\n";
} else if (strpos($response, 'no remaining sessions available') !== false) {
    echo "❌ Backend has OLD code (old CallSessionController)\n";
    echo "🔧 SOLUTION: Backend needs to be redeployed with new code\n";
} else {
    echo "❓ Unknown backend version\n";
}
