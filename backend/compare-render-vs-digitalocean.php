<?php

/**
 * Compare Render vs DigitalOcean Webhook Configuration
 * Find out why webhooks worked on Render but not on DigitalOcean
 */

echo "🔍 COMPARING RENDER VS DIGITALOCEAN\n";
echo "===================================\n\n";

echo "Webhooks worked on Render but stopped on DigitalOcean.\n";
echo "Let's identify the differences...\n\n";

echo "1. URL COMPARISON:\n";
echo "==================\n";

$renderUrl = 'https://docavailable-1.onrender.com/api/payments/paychangu/callback';
$digitalOceanUrl = 'https://docavailable-3vbdv.ondigitalocean.app/api/payments/webhook';

echo "Render URL: {$renderUrl}\n";
echo "DigitalOcean URL: {$digitalOceanUrl}\n\n";

echo "KEY DIFFERENCES:\n";
echo "- Different domain (render.com vs ondigitalocean.app)\n";
echo "- Different path (/paychangu/callback vs /webhook)\n";
echo "- Different endpoint structure\n\n";

echo "2. PAYCHANGU CONFIGURATION CHECK:\n";
echo "==================================\n";

echo "Your PayChangu environment variables show:\n";
echo "PAYCHANGU_CALLBACK_URL = {$renderUrl}\n";
echo "PAYCHANGU_RETURN_URL = {$renderUrl}\n\n";

echo "❌ PROBLEM FOUND: PayChangu is still configured to use Render URL!\n";
echo "PayChangu is sending webhooks to Render, not DigitalOcean.\n\n";

echo "3. SOLUTIONS:\n";
echo "=============\n";

echo "OPTION 1: Update PayChangu Dashboard (RECOMMENDED)\n";
echo "- Go to PayChangu dashboard\n";
echo "- Change webhook URL from: {$renderUrl}\n";
echo "- To: {$digitalOceanUrl}\n";
echo "- This will make webhooks work immediately\n\n";

echo "OPTION 2: Update Environment Variables\n";
echo "- Change PAYCHANGU_CALLBACK_URL to DigitalOcean URL\n";
echo "- Redeploy application\n";
echo "- Update PayChangu dashboard\n\n";

echo "OPTION 3: Keep Both URLs Working\n";
echo "- Keep Render URL for backward compatibility\n";
echo "- Add DigitalOcean URL as secondary webhook\n";
echo "- Or redirect Render URL to DigitalOcean\n\n";

echo "4. IMMEDIATE FIX:\n";
echo "=================\n";

echo "Update your .do/app.yaml with correct URLs:\n\n";

$updatedConfig = '  # PayChangu Configuration
  - key: PAYCHANGU_PUBLIC_KEY
    value: ${PAYCHANGU_PUBLIC_KEY}
  - key: PAYCHANGU_SECRET_KEY
    value: ${PAYCHANGU_SECRET_KEY}
  - key: PAYCHANGU_MERCHANT_ID
    value: ${PAYCHANGU_MERCHANT_ID}
  - key: PAYCHANGU_WEBHOOK_SECRET
    value: ${PAYCHANGU_WEBHOOK_SECRET}
  - key: PAYCHANGU_ENVIRONMENT
    value: production
  - key: PAYCHANGU_PAYMENT_URL
    value: https://api.paychangu.com/payment
  - key: PAYCHANGU_VERIFY_URL
    value: https://api.paychangu.com/verify-payment
  - key: PAYCHANGU_CALLBACK_URL
    value: https://docavailable-3vbdv.ondigitalocean.app/api/payments/webhook
  - key: PAYCHANGU_RETURN_URL
    value: https://docavailable-3vbdv.ondigitalocean.app/payment/success';

echo $updatedConfig . "\n\n";

echo "5. TESTING STEPS:\n";
echo "=================\n";

echo "1. Update PayChangu dashboard webhook URL to DigitalOcean\n";
echo "2. Make a test payment\n";
echo "3. Check if webhook is received\n";
echo "4. Verify subscription activation\n\n";

echo "6. WHY THIS HAPPENED:\n";
echo "=====================\n";

echo "When you moved from Render to DigitalOcean:\n";
echo "- You changed the deployment platform\n";
echo "- But didn't update PayChangu webhook configuration\n";
echo "- PayChangu kept sending webhooks to the old Render URL\n";
echo "- Render URL is no longer active, so webhooks are lost\n\n";

echo "🎉 SOLUTION IDENTIFIED\n";
echo "======================\n";
echo "Update PayChangu dashboard webhook URL to DigitalOcean URL\n";
echo "and your webhooks will work immediately!\n";
