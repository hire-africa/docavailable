<?php

// Check the actual database structure to see what fields exist
$apiUrl = 'https://docavailable-3vbdv.ondigitalocean.app/api';

$token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOi8vZG9jYXZhaWxhYmxlLTN2YmR2Lm9uZGlnaXRhbG9jZWFuLmFwcC9hcGkvbG9naW4iLCJpYXQiOjE3NTkxMzg2ODcsImV4cCI6MTc1OTE0MjI4NywibmJmIjoxNzU5MTM4Njg3LCJqdGkiOiIyUTQ2YkJTdG1nY3VWMHM3Iiwic3ViIjoiMSIsInBydiI6IjIzYmQ1Yzg5NDlmNjAwYWRiMzllNzAxYzQwMDg3MmRiN2E1OTc2ZjciLCJ1c2VyX3R5cGUiOiJwYXRpZW50IiwiZW1haWwiOiJ6ZWVtdG9oOTlAZ21haWwuY29tIiwiZGlzcGxheV9uYW1lIjoiUHJhaXNlIE10b3NhIn0.lythdGH1_mNEj8Wx-_4gjz5qJVMZXj2G7J1fnkC2RjY';

// Test the subscription endpoint to see the exact field names
echo "=== CHECKING SUBSCRIPTION FIELDS ===\n";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $apiUrl . '/subscription');
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

echo "Subscription API Response:\n";
echo "HTTP Code: $httpCode\n";
$data = json_decode($response, true);
echo "Response: " . json_encode($data, JSON_PRETTY_PRINT) . "\n\n";

// Test call availability check to see what the backend is actually checking
echo "=== CHECKING CALL AVAILABILITY ===\n";
$testData = [
    'call_type' => 'voice'
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $apiUrl . '/call-sessions/check-availability');
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

echo "Call Availability Check:\n";
echo "HTTP Code: $httpCode\n";
$data = json_decode($response, true);
echo "Response: " . json_encode($data, JSON_PRETTY_PRINT) . "\n\n";

// Test the actual call start to see the exact error
echo "=== TESTING CALL START ===\n";
$testData = [
    'call_type' => 'voice',
    'appointment_id' => 'test_direct_session_' . time(),
    'doctor_id' => 1,
    'reason' => 'Test call session'
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

echo "Call Start Test:\n";
echo "HTTP Code: $httpCode\n";
$data = json_decode($response, true);
echo "Response: " . json_encode($data, JSON_PRETTY_PRINT) . "\n";
