<?php

// Test call API with authentication
$apiUrl = 'https://docavailable-3vbdv.ondigitalocean.app/api/call-sessions/start';

// You'll need to get a real token from the app logs
// The token from the logs is: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOi8vZG9jYXZhaWxhYmxlLTN2YmR2Lm9uZGlnaXRhbG9jZWFuLmFwcC9hcGkvbG9naW4iLCJpYXQiOjE3NTkxMzg2ODcsImV4cCI6MTc1OTE0MjI4NywibmJmIjoxNzU5MTM4Njg3LCJqdGkiOiIyUTQ2YkJTdG1nY3VWMHM3Iiwic3ViIjoiMSIsInBydiI6IjIzYmQ1Yzg5NDlmNjAwYWRiMzllNzAxYzQwMDg3MmRiN2E1OTc2ZjciLCJ1c2VyX3R5cGUiOiJwYXRpZW50IiwiZW1haWwiOiJ6ZWVtdG9oOTlAZ21haWwuY29tIiwiZGlzcGxheV9uYW1lIjoiUHJhaXNlIE10b3NhIn0.lythdGH1_mNEj8Wx-_4gjz5qJVMZXj2G7J1fnkC2RjY

$token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOi8vZG9jYXZhaWxhYmxlLTN2YmR2Lm9uZGlnaXRhbG9jZWFuLmFwcC9hcGkvbG9naW4iLCJpYXQiOjE3NTkxMzg2ODcsImV4cCI6MTc1OTE0MjI4NywibmJmIjoxNzU5MTM4Njg3LCJqdGkiOiIyUTQ2YkJTdG1nY3VWMHM3Iiwic3ViIjoiMSIsInBydiI6IjIzYmQ1Yzg5NDlmNjAwYWRiMzllNzAxYzQwMDg3MmRiN2E1OTc2ZjciLCJ1c2VyX3R5cGUiOiJwYXRpZW50IiwiZW1haWwiOiJ6ZWVtdG9oOTlAZ21haWwuY29tIiwiZGlzcGxheV9uYW1lIjoiUHJhaXNlIE10b3NhIn0.lythdGH1_mNEj8Wx-_4gjz5qJVMZXj2G7J1fnkC2RjY';

$testData = [
    'call_type' => 'voice',
    'appointment_id' => 'test_direct_session_' . time(),
    'doctor_id' => 1,
    'reason' => 'Test call session with auth'
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $apiUrl);
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

echo "Authenticated Call API Test:\n";
echo "HTTP Code: $httpCode\n";
echo "Response: $response\n";

if ($httpCode === 200) {
    echo "✅ Call session created successfully!\n";
} else if ($httpCode === 400) {
    $data = json_decode($response, true);
    if ($data && isset($data['message'])) {
        echo "Error: " . $data['message'] . "\n";
        
        if (strpos($data['message'], 'no remaining sessions available') !== false) {
            echo "🔧 This is the subscription issue - user needs more sessions\n";
        } else if (strpos($data['message'], 'Doctor ID is required') !== false) {
            echo "🔧 This is a validation error - doctor ID missing\n";
        }
    }
} else {
    echo "❌ Unexpected error\n";
}
