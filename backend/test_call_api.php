<?php

// Test the call-sessions API endpoint
$apiUrl = 'https://docavailable-3vbdv.ondigitalocean.app/api/call-sessions/start';

$testData = [
    'call_type' => 'voice',
    'appointment_id' => 'test_direct_session_' . time(),
    'doctor_id' => 1, // Assuming doctor ID 1 exists
    'reason' => 'Test call session from API'
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $apiUrl);
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

echo "API Test Results:\n";
echo "HTTP Code: $httpCode\n";
echo "Response: $response\n";

if ($httpCode === 200) {
    $data = json_decode($response, true);
    if ($data && $data['success']) {
        echo "✅ API call successful!\n";
        echo "Session ID: " . ($data['data']['session_id'] ?? 'N/A') . "\n";
        echo "Appointment ID: " . ($data['data']['appointment_id'] ?? 'N/A') . "\n";
        echo "Call Type: " . ($data['data']['call_type'] ?? 'N/A') . "\n";
        echo "Status: " . ($data['data']['status'] ?? 'N/A') . "\n";
    } else {
        echo "❌ API returned error: " . ($data['message'] ?? 'Unknown error') . "\n";
    }
} else {
    echo "❌ API call failed with HTTP code: $httpCode\n";
}
