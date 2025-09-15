<?php

// Test webhook with an existing transaction
echo "🔍 TESTING WEBHOOK WITH EXISTING TRANSACTION\n";
echo "============================================\n\n";

// Test 1: Create a transaction first using the test webhook
echo "1. Creating a transaction first...\n";
$testWebhookUrl = 'https://docavailable-1.onrender.com/api/payments/test-webhook';

$testData = [
    'user_id' => 11,
    'plan_id' => 5,
    'reference' => 'WEBHOOK_TEST_' . time(),
    'amount' => 50.00,
    'currency' => 'USD'
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $testWebhookUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($testData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Test Webhook HTTP Code: $httpCode\n";
$responseData = json_decode($response, true);

if ($httpCode === 200) {
    echo "✅ Transaction created successfully\n";
    if (isset($responseData['test_data']['reference'])) {
        $reference = $responseData['test_data']['reference'];
        echo "Reference: " . $reference . "\n";
        
        // Test 2: Now test the actual webhook with this transaction
        echo "\n2. Testing actual webhook with created transaction...\n";
        $webhookUrl = 'https://docavailable-1.onrender.com/api/payments/webhook';
        
        $webhookData = [
            'transaction_id' => 'WEBHOOK_TXN_' . time(),
            'reference' => $reference, // Use the same reference
            'amount' => 50.00,
            'currency' => 'USD',
            'status' => 'success',
            'phone_number' => '+265123456789',
            'payment_method' => 'mobile_money',
            'payment_channel' => 'Mobile Money',
            'name' => 'Test User',
            'email' => 'test@example.com',
            'paid_at' => date('Y-m-d H:i:s'),
            'meta' => [
                'user_id' => 11,
                'plan_id' => 5,
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
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        echo "Webhook HTTP Code: $httpCode\n";
        $webhookResponse = json_decode($response, true);
        echo "Webhook Response:\n";
        print_r($webhookResponse);
        
        // Test 3: Check if subscription was created
        echo "\n3. Checking if subscription was created...\n";
        $subscriptionUrl = 'https://docavailable-1.onrender.com/api/users/11/subscription';
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $subscriptionUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Accept: application/json'
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        echo "Subscription Check HTTP Code: $httpCode\n";
        $subscriptionData = json_decode($response, true);
        
        if ($httpCode === 200 && isset($subscriptionData['subscription'])) {
            echo "🎉 SUCCESS! Subscription created successfully!\n";
            $subscription = $subscriptionData['subscription'];
            echo "- ID: " . $subscription['id'] . "\n";
            echo "- Plan ID: " . $subscription['plan_id'] . "\n";
            echo "- Is Active: " . ($subscription['is_active'] ? 'Yes' : 'No') . "\n";
            echo "- Text Sessions Remaining: " . $subscription['text_sessions_remaining'] . "\n";
        } else {
            echo "❌ No subscription found\n";
            if (isset($subscriptionData['error'])) {
                echo "Error: " . $subscriptionData['error'] . "\n";
            }
        }
        
    } else {
        echo "❌ Could not get reference from test webhook\n";
    }
} else {
    echo "❌ Test webhook failed\n";
    if (isset($responseData['error'])) {
        echo "Error: " . $responseData['error'] . "\n";
    }
}

// Analysis
echo "\n" . str_repeat("=", 50) . "\n";
echo "📋 ANALYSIS\n";
echo str_repeat("=", 50) . "\n";

if ($httpCode === 200 && isset($webhookResponse['success']) && $webhookResponse['success']) {
    echo "🎉 SUCCESS! Webhook is working and creating subscriptions!\n";
    echo "The Buy Now button should now work perfectly!\n";
} else {
    echo "❌ Webhook is still failing\n";
    echo "The issue might be:\n";
    echo "1. Database migration not applied\n";
    echo "2. Plans table missing required fields\n";
    echo "3. Webhook processing logic has issues\n";
    echo "4. Database connection problems\n";
}

echo "\n🎯 NEXT STEPS:\n";
echo "1. If webhook succeeded → Test the Buy Now button\n";
echo "2. If webhook failed → Check database migration\n";
echo "3. Complete a real payment through PayChangu\n";
echo "4. Check if subscription is created after payment\n"; 