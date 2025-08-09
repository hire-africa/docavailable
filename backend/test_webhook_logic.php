<?php

// Test to check current webhook logic
echo "🔍 Testing Current Webhook Logic...\n\n";

$webhookUrl = 'https://docavailable-1.onrender.com/api/payments/webhook';

// Test with different status values to see what happens
$testStatuses = ['success', 'confirmed', 'completed', 'pending', 'failed'];

foreach ($testStatuses as $testStatus) {
    echo "Testing with status: '$testStatus'\n";
    
    $webhookData = [
        'transaction_id' => 'LOGIC_TEST_' . time() . '_' . $testStatus,
        'reference' => 'LOGIC_TEST_REF_' . time() . '_' . $testStatus,
        'amount' => 100.00,
        'currency' => 'MWK',
        'status' => $testStatus,
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

    echo "  HTTP Code: $httpCode\n";
    $responseData = json_decode($response, true);
    
    if (isset($responseData['error'])) {
        echo "  Error: " . $responseData['error'] . "\n";
        
        // Check if the error mentions 'success' vs 'completed'
        if (str_contains($responseData['error'], 'success')) {
            echo "  ❌ Still trying to insert 'success'\n";
        } elseif (str_contains($responseData['error'], 'completed')) {
            echo "  ✅ Trying to insert 'completed'\n";
        }
    } else {
        echo "  ✅ Success!\n";
    }
    
    echo "\n";
    
    // Wait a bit between tests
    sleep(1);
}

echo "=== Summary ===\n";
echo "This test will help us understand what the current webhook logic is doing.\n";
echo "If all tests show 'success' in the error, the deployment hasn't updated yet.\n";
echo "If some tests show 'completed', the mapping is working for those statuses.\n"; 