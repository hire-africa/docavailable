<?php

echo "🧪 TESTING PRODUCTION WEBHOOK\n";
echo "=============================\n\n";

// Test webhook data
$data = [
    'event_type' => 'api.charge.payment',
    'status' => 'success',
    'amount' => 100,
    'currency' => 'MWK',
    'meta' => json_encode(['user_id' => 1, 'plan_id' => 4])
];

$url = 'https://docavailable-backend.ondigitalocean.app/api/payments/webhook';

echo "Testing webhook endpoint: {$url}\n";
echo "Data: " . json_encode($data) . "\n\n";

// Use file_get_contents for simple testing
$context = stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => 'Content-Type: application/json',
        'content' => json_encode($data),
        'timeout' => 10
    ]
]);

$response = file_get_contents($url, false, $context);

if ($response === false) {
    echo "❌ Failed to connect to webhook endpoint\n";
} else {
    echo "✅ Webhook endpoint responded\n";
    echo "Response: {$response}\n";
}

echo "\n🎉 TEST COMPLETED\n";
