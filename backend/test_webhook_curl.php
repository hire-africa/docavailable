<?php

// Test with actual PayChangu webhook structure
echo "🧪 Testing PayChangu Webhook...\n\n";

$webhookData = [
    'event_type' => 'checkout.payment',
    'first_name' => 'Test',
    'last_name' => 'User',
    'email' => 'test@example.com',
    'currency' => 'MWK',
    'amount' => 100,
    'charge' => 3,
    'amount_split' => [
        'fee_paid_by_customer' => 0,
        'fee_paid_by_merchant' => 3,
        'total_amount_paid_by_customer' => 100,
        'amount_received_by_merchant' => 97
    ],
    'total_amount_paid' => 100,
    'mode' => 'live',
    'type' => 'API Payment (Checkout)',
    'status' => 'success',
    'reference' => 'TEST_REF_' . time(),
    'tx_ref' => 'PLAN_TEST_' . time(),
    'customization' => [
        'title' => 'DocAvailable Plan Purchase',
        'description' => 'Basic Life',
        'logo' => null
    ],
    'meta' => json_encode([
        'user_id' => 11,
        'plan_id' => 5
    ]),
    'customer' => [
        'customer_ref' => 'cs_test_' . time(),
        'email' => 'test@example.com',
        'first_name' => 'Test',
        'last_name' => 'User',
        'phone' => '+265123456789',
        'created_at' => time()
    ],
    'authorization' => [
        'channel' => 'Mobile Money',
        'card_details' => null,
        'bank_payment_details' => null,
        'mobile_money' => [
            'mobile_number' => '+265980xxxx99',
            'operator' => 'Airtel Money',
            'trans_id' => null
        ],
        'completed_at' => null
    ],
    'created_at' => date('Y-m-d\TH:i:s.000000\Z'),
    'updated_at' => date('Y-m-d\TH:i:s.000000\Z')
];

// Send webhook to your local development server
$ch = curl_init('https://docavailable-1.onrender.com/api/payments/webhook');
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($webhookData));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Status Code: $httpCode\n";
echo "Response:\n";
$responseData = json_decode($response, true);
print_r($responseData);

if ($httpCode === 200 && isset($responseData['success']) && $responseData['success']) {
    echo "\n🎉 SUCCESS: Webhook test passed!\n";
    echo "✅ Payment data processed\n";
    echo "✅ Subscription created/updated\n";
} else {
    echo "\n❌ FAILED: Webhook test failed\n";
    echo "Error: " . ($responseData['error'] ?? 'Unknown error') . "\n";
}
