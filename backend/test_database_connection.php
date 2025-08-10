<?php

echo "=== Testing Database Connection ===\n\n";

// Test if we can connect using individual variables
$url = 'https://docavailable-1.onrender.com/api/health';

$response = file_get_contents($url);
$data = json_decode($response, true);

echo "Health Check Response:\n";
echo json_encode($data, JSON_PRETTY_PRINT) . "\n\n";

// Test if we can access the database directly
$url2 = 'https://docavailable-1.onrender.com/api/payments/test-webhook';

$context = stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => [
            'Content-Type: application/json'
        ],
        'content' => json_encode([
            'user_id' => 13,
            'plan_id' => 1,
            'currency' => 'MWK',
            'amount' => 100
        ])
    ]
]);

$response2 = file_get_contents($url2, false, $context);
$httpCode2 = $http_response_header[0] ?? 'Unknown';

echo "Test Webhook Response:\n";
echo "HTTP Code: " . (strpos($httpCode2, '200') !== false ? '200' : 'Error') . "\n";
echo "Response: " . $response2 . "\n\n";

echo "=== Test Complete ===\n";
