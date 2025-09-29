<?php

// Test the production call-sessions API endpoint
$apiUrl = 'https://docavailable-3vbdv.ondigitalocean.app/api/call-sessions/check-availability';

$testData = [
    'call_type' => 'voice'
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

echo "Production API Test Results:\n";
echo "HTTP Code: $httpCode\n";
echo "Response: $response\n";

if ($httpCode === 200) {
    $data = json_decode($response, true);
    if ($data && isset($data['can_make_call'])) {
        echo "✅ API is working! Can make call: " . ($data['can_make_call'] ? 'true' : 'false') . "\n";
        echo "Remaining calls: " . ($data['remaining_calls'] ?? 'N/A') . "\n";
    } else {
        echo "❌ Unexpected response format\n";
    }
} else {
    echo "❌ API call failed with HTTP code: $httpCode\n";
}
