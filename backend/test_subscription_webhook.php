<?php

// Test webhook with Basic Life MWK plan
echo "🔍 Testing webhook with Basic Life MWK plan...\n";

// Simulate PayChangu webhook data
$testData = [
    'transaction_id' => 'TEST_' . time(),
    'reference' => 'TEST_SUB_' . time(),
    'amount' => 100.00, // Basic Life MWK price
    'currency' => 'MWK',
    'status' => 'success',
    'phone_number' => '+265123456789',
    'payment_method' => 'mobile_money',
    'payment_channel' => 'Mobile Money',
    'name' => 'Test User',
    'email' => 'test@example.com',
    'paid_at' => date('Y-m-d H:i:s'),
    'meta' => [
        'user_id' => 11,
        'plan_id' => 1, // Basic Life MWK
    ]
];

echo "Testing with PayChangu webhook data:\n";
print_r($testData);
echo "\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://docavailable-1.onrender.com/api/payments/webhook');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($testData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

echo "HTTP Status Code: $httpCode\n";
if ($curlError) {
    echo "Curl Error: $curlError\n";
}
echo "Response:\n";
$responseData = json_decode($response, true);
print_r($responseData);

if ($httpCode === 200 && isset($responseData['success']) && $responseData['success']) {
    echo "\n✅ Webhook processed successfully!\n";
    
    // Check subscription endpoint
    echo "\nChecking subscription status...\n";
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://docavailable-1.onrender.com/api/subscriptions/patient/11");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Accept: application/json']);
    
    $subResponse = curl_exec($ch);
    $subHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    echo "Subscription Check HTTP Code: $subHttpCode\n";
    if ($subHttpCode === 200) {
        $subData = json_decode($subResponse, true);
        if (isset($subData['subscription'])) {
            echo "✅ Found active subscription:\n";
            print_r($subData['subscription']);
        } else {
            echo "❌ No subscription found in response\n";
        }
    } else {
        echo "❌ Failed to check subscription status\n";
    }
} else {
    echo "\n❌ Webhook failed!\n";
    if ($httpCode === 500) {
        echo "\n=== Possible Issues ===\n";
        if (isset($responseData['error'])) {
            echo "Error: " . $responseData['error'] . "\n\n";
        }
        echo "The webhook failed with 500 error. Possible causes:\n";
        echo "1. Plan ID 1 (Basic Life MWK) might not exist\n";
        echo "2. Database connection issues\n";
        echo "3. Subscription table structure issue\n";
        echo "4. Transaction rollback\n";
        
        echo "\nCheck the server logs for details.\n";
    }
}