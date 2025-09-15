<?php

// Debug status mapping logic
echo "🔍 Debugging Status Mapping...\n\n";

// Test the status mapping logic
$testStatuses = ['success', 'confirmed', 'completed', 'pending', 'failed'];

foreach ($testStatuses as $originalStatus) {
    $status = $originalStatus;
    
    // Handle PayChangu specific status mapping - do this immediately
    if ($status === 'confirmed' || $status === 'completed' || $status === 'success') {
        $status = 'completed'; // Use 'completed' instead of 'success' for database compatibility
    }
    
    echo "Original: '$originalStatus' -> Mapped: '$status'\n";
}

echo "\n=== Test with webhook data ===\n";

$webhookData = [
    'transaction_id' => 'DEBUG_STATUS_' . time(),
    'reference' => 'DEBUG_STATUS_REF_' . time(),
    'amount' => 100.00,
    'currency' => 'MWK',
    'status' => 'success', // This should be mapped to 'completed'
    'phone_number' => '+265123456789',
    'payment_method' => 'mobile_money',
    'payment_channel' => 'Mobile Money',
    'name' => 'Test User',
    'email' => 'test@example.com',
    'paid_at' => date('Y-m-d H:i:s'),
    'meta' => [
        'user_id' => 1,
        'plan_id' => 1,
    ]
];

echo "Original webhook data status: " . $webhookData['status'] . "\n";

// Extract and map status
$status = $webhookData['status'] ?? 'pending';

// Handle PayChangu specific status mapping - do this immediately
if ($status === 'confirmed' || $status === 'completed' || $status === 'success') {
    $status = 'completed'; // Use 'completed' instead of 'success' for database compatibility
}

echo "Mapped status: $status\n";

// Test the webhook with the mapped status
$webhookData['status'] = $status;

echo "Updated webhook data:\n";
print_r($webhookData);

echo "\n=== Testing webhook with mapped status ===\n";

$webhookUrl = 'https://docavailable-1.onrender.com/api/payments/webhook';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $webhookUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($webhookData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Status Code: $httpCode\n";
echo "Response:\n";
$responseData = json_decode($response, true);
print_r($responseData);

if ($httpCode === 200 && isset($responseData['success']) && $responseData['success']) {
    echo "\n✅ SUCCESS: Status mapping is working correctly!\n";
} else {
    echo "\n❌ FAILED: Status mapping still has issues\n";
} 