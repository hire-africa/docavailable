<?php

// Debug detailed error information
echo "🔍 Debugging Detailed Error...\n\n";

$webhookUrl = 'https://docavailable-1.onrender.com/api/payments/webhook';

$webhookData = [
    'transaction_id' => 'DETAILED_ERROR_TEST_' . time(),
    'reference' => 'DETAILED_ERROR_TEST_REF_' . time(),
    'amount' => 100.00,
    'currency' => 'MWK',
    'status' => 'completed',
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

echo "Testing webhook with detailed error capture:\n";
print_r($webhookData);
echo "\n";

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
echo "Full Response:\n";
echo $response . "\n\n";

$responseData = json_decode($response, true);

if ($httpCode === 200 && isset($responseData['success']) && $responseData['success']) {
    echo "🎉 SUCCESS: Webhook is working completely!\n";
} else {
    echo "❌ FAILED: Still have issues\n";
    
    if (isset($responseData['error'])) {
        echo "Error: " . $responseData['error'] . "\n";
        
        // Check for specific error patterns
        if (str_contains($responseData['error'], 'SQLSTATE')) {
            echo "🔍 This is a database constraint violation\n";
        }
        
        if (str_contains($responseData['error'], 'subscription')) {
            echo "🔍 This is related to subscription table\n";
        }
        
        if (str_contains($responseData['error'], 'constraint')) {
            echo "🔍 This is a constraint violation\n";
        }
    }
    
    // Try to get more detailed error from logs
    echo "\n=== Analysis ===\n";
    echo "The database schema looks correct based on the CSV.\n";
    echo "The issue might be:\n";
    echo "1. A different constraint violation\n";
    echo "2. A missing foreign key relationship\n";
    echo "3. A data type mismatch\n";
    echo "4. A different table constraint\n";
} 