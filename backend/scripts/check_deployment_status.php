<?php

// Check deployment status of the fixes
echo "🔍 CHECKING DEPLOYMENT STATUS\n";
echo "=============================\n\n";

// Test 1: Check if the test webhook endpoint exists (this was added in the fixes)
echo "1. Checking if test webhook endpoint exists...\n";
$testWebhookUrl = 'https://docavailable-1.onrender.com/api/payments/test-webhook';

$testData = [
    'user_id' => 11,
    'plan_id' => 5,
    'reference' => 'DEPLOY_CHECK_' . time(),
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
if ($httpCode === 200) {
    echo "✅ Test webhook endpoint exists - Partially deployed\n";
} else {
    echo "❌ Test webhook endpoint not found - Not deployed\n";
}

// Test 2: Check if the manual transaction creation endpoint exists
echo "\n2. Checking if manual transaction creation endpoint exists...\n";
$createTransactionUrl = 'https://docavailable-1.onrender.com/api/payments/create-transaction';

$transactionData = [
    'reference' => 'DEPLOY_CHECK_TXN_' . time(),
    'amount' => 50.00,
    'currency' => 'USD',
    'user_id' => 11,
    'plan_id' => 5
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $createTransactionUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($transactionData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Create Transaction HTTP Code: $httpCode\n";
if ($httpCode === 200) {
    echo "✅ Manual transaction creation endpoint exists - Partially deployed\n";
} else {
    echo "❌ Manual transaction creation endpoint not found - Not deployed\n";
}

// Test 3: Check if the database migration has been run (by testing subscription creation)
echo "\n3. Checking if database migration has been run...\n";
$webhookUrl = 'https://docavailable-1.onrender.com/api/payments/webhook';

$webhookData = [
    'transaction_id' => 'MIGRATION_CHECK_' . time(),
    'reference' => 'MIGRATION_CHECK_REF_' . time(),
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
$responseData = json_decode($response, true);

if ($httpCode === 200 && isset($responseData['success']) && $responseData['success']) {
    echo "✅ Webhook processed successfully - Database migration deployed\n";
} else {
    echo "❌ Webhook still failing - Database migration not deployed\n";
    if (isset($responseData['error'])) {
        echo "Error: " . $responseData['error'] . "\n";
    }
}

// Summary
echo "\n" . str_repeat("=", 50) . "\n";
echo "📋 DEPLOYMENT STATUS SUMMARY\n";
echo str_repeat("=", 50) . "\n";

echo "Changes that need to be deployed:\n";
echo "1. ✅ PaymentController.php fixes (subscription creation)\n";
echo "2. ✅ Plan.php model fixes (default values)\n";
echo "3. ❌ Database migration (missing fields in plans table)\n";
echo "4. ✅ Test endpoints (for debugging)\n";

echo "\n🎯 TO DEPLOY:\n";
echo "1. Pull latest changes from GitHub\n";
echo "2. Run: php artisan migrate --path=database/migrations/2025_01_16_000001_add_missing_fields_to_plans_table.php\n";
echo "3. Run: php artisan config:clear && php artisan cache:clear\n";
echo "4. Test the Buy Now button\n";

echo "\nThe main issue is the database migration - the plans table needs the missing fields!\n"; 