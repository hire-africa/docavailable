<?php

// Test webhook configuration and PayChangu dashboard settings
echo "🔍 TESTING WEBHOOK CONFIGURATION\n";
echo "================================\n\n";

// Test 1: Check if webhook endpoint is accessible
echo "1. Testing webhook endpoint accessibility...\n";
$webhookUrl = 'https://docavailable-1.onrender.com/api/payments/webhook';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $webhookUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['test' => 'data']));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

echo "Webhook Endpoint HTTP Code: $httpCode\n";
echo "Curl Error: " . ($curlError ?: 'None') . "\n";

if ($httpCode === 200 || $httpCode === 400 || $httpCode === 404) {
    echo "✅ Webhook endpoint is accessible\n";
} else {
    echo "❌ Webhook endpoint not accessible\n";
}

// Test 2: Check environment variables
echo "\n2. Checking webhook configuration...\n";
echo "Webhook URL: $webhookUrl\n";
echo "This should be configured in PayChangu dashboard\n\n";

// Test 3: Check what PayChangu should send
echo "3. PayChangu Webhook Configuration Checklist:\n";
echo "============================================\n";
echo "✅ Webhook URL: $webhookUrl\n";
echo "❓ Webhook Secret: Check if configured in PayChangu dashboard\n";
echo "❓ Webhook Events: Check if payment events are enabled\n";
echo "❓ HTTP Method: Should be POST\n";
echo "❓ Content-Type: Should be application/json\n\n";

// Test 4: Simulate PayChangu webhook format
echo "4. Expected PayChangu Webhook Format:\n";
echo "=====================================\n";
$expectedWebhookData = [
    'transaction_id' => 'TXN_' . time(),
    'reference' => 'REF_' . time(),
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

echo "Expected webhook data format:\n";
print_r($expectedWebhookData);

// Test 5: Test with expected format
echo "\n5. Testing with expected PayChangu format...\n";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $webhookUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($expectedWebhookData));
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
echo "Response:\n";
print_r($responseData);

// Analysis
echo "\n" . str_repeat("=", 50) . "\n";
echo "📋 WEBHOOK CONFIGURATION ANALYSIS\n";
echo str_repeat("=", 50) . "\n";

echo "🔍 POTENTIAL ISSUES:\n";
echo "1. ❓ Webhook URL not configured in PayChangu dashboard\n";
echo "2. ❓ Webhook secret not configured in PayChangu dashboard\n";
echo "3. ❓ Webhook events not enabled in PayChangu dashboard\n";
echo "4. ❓ PayChangu not sending webhooks to your URL\n";
echo "5. ❓ Webhook format mismatch between PayChangu and your code\n\n";

echo "🎯 PAYCHANGU DASHBOARD CHECKLIST:\n";
echo "================================\n";
echo "1. ✅ Go to PayChangu dashboard\n";
echo "2. ✅ Navigate to Webhook settings\n";
echo "3. ✅ Add webhook URL: $webhookUrl\n";
echo "4. ✅ Set webhook secret (if required)\n";
echo "5. ✅ Enable payment success events\n";
echo "6. ✅ Enable payment failure events\n";
echo "7. ✅ Test webhook delivery\n\n";

echo "🔧 TROUBLESHOOTING STEPS:\n";
echo "========================\n";
echo "1. Check PayChangu dashboard webhook configuration\n";
echo "2. Verify webhook URL is correct\n";
echo "3. Check if webhook secret is required\n";
echo "4. Test webhook delivery in PayChangu dashboard\n";
echo "5. Check PayChangu logs for webhook delivery status\n";
echo "6. Verify your server can receive webhooks\n\n";

echo "📞 PAYCHANGU SUPPORT:\n";
echo "====================\n";
echo "If webhook configuration is correct but still not working:\n";
echo "1. Contact PayChangu support\n";
echo "2. Ask them to check webhook delivery logs\n";
echo "3. Verify your webhook URL is accessible\n";
echo "4. Check if there are any IP restrictions\n"; 