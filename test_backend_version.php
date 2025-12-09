<?php

// Test if the production backend has our updated code
$apiUrl = 'https://docavailable-3vbdv.ondigitalocean.app/api/call-sessions/start';

$testData = [
    'call_type' => 'voice',
    'appointment_id' => 'test_direct_session_' . time(),
    'doctor_id' => 1,
    'reason' => 'Test call session'
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

echo "Backend Version Test:\n";
echo "HTTP Code: $httpCode\n";
echo "Response: $response\n";

if ($httpCode === 401) {
    echo "✅ Backend is responding (authentication required)\n";
} else if ($httpCode === 400) {
    $data = json_decode($response, true);
    if ($data && isset($data['message'])) {
        echo "Response message: " . $data['message'] . "\n";
        
        // Check if it's our new error message
        if (strpos($data['message'], 'Doctor ID is required') !== false) {
            echo "✅ Backend has NEW code (updated CallSessionController)\n";
        } else if (strpos($data['message'], 'Invalid call type') !== false) {
            echo "✅ Backend has NEW code (updated CallSessionController)\n";
        } else {
            echo "❌ Backend has OLD code (old CallSessionController)\n";
        }
    }
} else {
    echo "❌ Unexpected response\n";
}
