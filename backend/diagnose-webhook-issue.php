<?php

/**
 * Diagnose Webhook Issue
 * Find out why PayChangu webhooks aren't being sent automatically
 */

echo "🔍 DIAGNOSING WEBHOOK ISSUE\n";
echo "===========================\n\n";

echo "The problem: PayChangu completes payments but doesn't send webhooks automatically.\n";
echo "This means payments are processed but subscriptions aren't activated.\n\n";

echo "1. POSSIBLE CAUSES:\n";
echo "===================\n";
echo "❌ Webhook URL not configured in PayChangu dashboard\n";
echo "❌ Webhook URL is incorrect\n";
echo "❌ PayChangu webhook settings disabled\n";
echo "❌ Webhook URL not accessible from PayChangu servers\n";
echo "❌ Webhook signature verification failing\n";
echo "❌ Webhook endpoint returning errors\n\n";

echo "2. CURRENT WEBHOOK CONFIGURATION:\n";
echo "==================================\n";

// Check current webhook URL in your config
$webhookUrl = 'https://docavailable-3vbdv.ondigitalocean.app/api/payments/webhook';
echo "Webhook URL: {$webhookUrl}\n";

// Test if webhook endpoint is accessible
echo "\nTesting webhook endpoint accessibility...\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $webhookUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['test' => 'webhook']));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

echo "HTTP Code: {$httpCode}\n";
echo "Response: {$response}\n";
if ($curlError) {
    echo "Error: {$curlError}\n";
}

if ($httpCode === 200) {
    echo "✅ Webhook endpoint is accessible\n";
} else {
    echo "❌ Webhook endpoint is not accessible\n";
}

echo "\n3. PAYCHANGU WEBHOOK SETUP CHECKLIST:\n";
echo "======================================\n";

echo "You need to configure webhooks in your PayChangu dashboard:\n\n";

echo "STEP 1: Log into PayChangu Dashboard\n";
echo "- Go to https://dashboard.paychangu.com\n";
echo "- Log in with your PayChangu account\n\n";

echo "STEP 2: Navigate to Webhook Settings\n";
echo "- Look for 'Webhooks' or 'API Settings' section\n";
echo "- Find 'Webhook URL' or 'Callback URL' setting\n\n";

echo "STEP 3: Configure Webhook URL\n";
echo "Set webhook URL to: {$webhookUrl}\n\n";

echo "STEP 4: Configure Webhook Events\n";
echo "Enable these events:\n";
echo "- checkout.payment.completed\n";
echo "- checkout.payment.success\n";
echo "- payment.success\n";
echo "- Any payment completion events\n\n";

echo "STEP 5: Test Webhook\n";
echo "- Use PayChangu's webhook test feature if available\n";
echo "- Or make a test payment to verify webhook is sent\n\n";

echo "4. ALTERNATIVE SOLUTIONS:\n";
echo "=========================\n";

echo "If webhooks still don't work, consider these alternatives:\n\n";

echo "OPTION 1: Polling System\n";
echo "- Create a cron job that checks PayChangu API every few minutes\n";
echo "- Query for pending payments and process them\n";
echo "- Less efficient but more reliable\n\n";

echo "OPTION 2: Payment Status Check on App Load\n";
echo "- Check payment status when user opens the app\n";
echo "- Process any completed payments that weren't webhooked\n";
echo "- Good for user experience\n\n";

echo "OPTION 3: Manual Payment Verification\n";
echo "- Add a 'Verify Payment' button in your app\n";
echo "- Let users manually trigger payment verification\n";
echo "- Fallback solution\n\n";

echo "5. IMMEDIATE ACTION REQUIRED:\n";
echo "============================\n";

echo "1. Check PayChangu dashboard for webhook configuration\n";
echo "2. Set webhook URL to: {$webhookUrl}\n";
echo "3. Enable payment completion events\n";
echo "4. Test with a small payment\n";
echo "5. Monitor webhook logs\n\n";

echo "6. WEBHOOK TESTING:\n";
echo "===================\n";

echo "To test if webhooks are working:\n";
echo "1. Make a small test payment (like 1 MWK)\n";
echo "2. Complete the payment on PayChangu\n";
echo "3. Check if webhook is received within 30 seconds\n";
echo "4. If not, check PayChangu dashboard settings\n\n";

echo "🎉 DIAGNOSIS COMPLETED\n";
echo "======================\n";
echo "The main issue is likely webhook configuration in PayChangu dashboard.\n";
echo "Fix that and your payments will auto-process immediately!\n";
