<?php

echo "🔍 Testing webhook after deployment with enhanced logging...\n\n";

// Real PayChangu webhook payload format
$testData = [
    'event_type' => 'checkout.payment',
    'first_name' => 'Jsjdjd',
    'last_name' => 'djdjd',
    'email' => 'josa@gmail.com',
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
    'reference' => '30170098836',
    'tx_ref' => 'PLAN_f7bd7975-7050-431f-b20f-c308f151fc88',
    'customization' => [
        'title' => 'DocAvailable Plan Purchase',
        'description' => 'Basic Life',
        'logo' => null
    ],
    'meta' => json_encode([
        'user_id' => 13,
        'plan_id' => 1
    ]),
    'customer' => [
        'customer_ref' => 'cs_ddb89e13614e8fe',
        'email' => 'josa@gmail.com',
        'first_name' => 'Jsjdjd',
        'last_name' => 'djdjd',
        'phone' => '980794099',
        'created_at' => 1754670159
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
    'created_at' => '2025-08-09T12:09:22.000000Z',
    'updated_at' => '2025-08-09T12:09:35.000000Z'
];

echo "Sending webhook data:\n";
print_r($testData);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://docavailable-1.onrender.com/api/payments/webhook');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($testData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json',
    'Signature: 3b7a4fea184f4926658ee0823c05893124613658c96b9c3a6d897be0438952bf'
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

echo "\nWebhook Response:\n";
echo "HTTP Status Code: $httpCode\n";
if ($error) {
    echo "Curl Error: $error\n";
}
echo "Response Body:\n";
$responseData = json_decode($response, true);
print_r($responseData);

// If we get a database error, let's check the database connection directly
if ($httpCode === 500 && strpos($response, 'SQLSTATE[08006]') !== false) {
    echo "\n🔍 Testing database connection directly...\n";
    
    $dsn = "pgsql:host=ep-hidden-brook-aemmopjb-pooler.c-2.us-east-2.aws.neon.tech;port=5432;dbname=neondb;sslmode=require;options=endpoint%3Dep-hidden-brook-aemmopjb-pooler";
    $username = "neondb_owner";
    $password = "npg_FjoWxz8OU4CQ";
    
    try {
        echo "Attempting direct PDO connection...\n";
        $pdo = new PDO($dsn, $username, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_TIMEOUT => 30
        ]);
        echo "✅ Direct database connection successful!\n";
        
        // Test query
        $result = $pdo->query("SELECT COUNT(*) as count FROM plans")->fetch(PDO::FETCH_ASSOC);
        echo "Number of plans in database: " . $result['count'] . "\n";
    } catch (PDOException $e) {
        echo "❌ Direct database connection failed:\n";
        echo $e->getMessage() . "\n";
    }
}
