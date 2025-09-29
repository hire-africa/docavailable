<?php

// Check what call sessions exist in the database
$apiUrl = 'https://docavailable-3vbdv.ondigitalocean.app/api';

$token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOi8vZG9jYXZhaWxhYmxlLTN2YmR2Lm9uZGlnaXRhbG9jZWFuLmFwcC9hcGkvbG9naW4iLCJpYXQiOjE3NTkxMzg2ODcsImV4cCI6MTc1OTE0MjI4NywibmJmIjoxNzU5MTM4Njg3LCJqdGkiOiIyUTQ2YkJTdG1nY3VWMHM3Iiwic3ViIjoiMSIsInBydiI6IjIzYmQ1Yzg5NDlmNjAwYWRiMzllNzAxYzQwMDg3MmRiN2E1OTc2ZjciLCJ1c2VyX3R5cGUiOiJwYXRpZW50IiwiZW1haWwiOiJ6ZWVtdG9oOTlAZ21haWwuY29tIiwiZGlzcGxheV9uYW1lIjoiUHJhaXNlIE10b3NhIn0.lythdGH1_mNEj8Wx-_4gjz5qJVMZXj2G7J1fnkC2RjY';

echo "=== CHECKING CALL SESSIONS ===\n";

// Test call sessions endpoint (if it exists)
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $apiUrl . '/call-sessions');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json',
    'Authorization: Bearer ' . $token
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Call Sessions List:\n";
echo "HTTP Code: $httpCode\n";
echo "Response: $response\n\n";

// Test ending the call session
echo "=== TESTING CALL SESSION END ===\n";
$testData = [
    'session_id' => 1, // The session we created earlier
    'call_type' => 'voice'
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $apiUrl . '/call-sessions/end');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($testData));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json',
    'Authorization: Bearer ' . $token
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "End Call Session:\n";
echo "HTTP Code: $httpCode\n";
$data = json_decode($response, true);
echo "Response: " . json_encode($data, JSON_PRETTY_PRINT) . "\n\n";

// Now test video call again
echo "=== TESTING VIDEO CALL AFTER ENDING SESSION ===\n";
$testData = [
    'call_type' => 'video',
    'appointment_id' => 'test_video_session_2_' . time(),
    'doctor_id' => 1,
    'reason' => 'Test video call session after ending previous'
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $apiUrl . '/call-sessions/start');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($testData));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json',
    'Authorization: Bearer ' . $token
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Video Call Start After Ending Session:\n";
echo "HTTP Code: $httpCode\n";
$data = json_decode($response, true);
echo "Response: " . json_encode($data, JSON_PRETTY_PRINT) . "\n";
