<?php

/**
 * Fix PayChangu Webhook Signature Verification
 * 
 * The issue: PayChangu environment variables are missing from DigitalOcean config
 * This causes signature verification to fail, blocking all webhook processing
 */

echo "🔧 FIXING PAYCHANGU WEBHOOK SIGNATURE VERIFICATION\n";
echo "==================================================\n\n";

echo "PROBLEM IDENTIFIED:\n";
echo "===================\n";
echo "❌ PayChangu environment variables are missing from DigitalOcean config\n";
echo "❌ This causes signature verification to fail\n";
echo "❌ All webhooks are rejected with 'Invalid signature'\n";
echo "❌ Payments are never processed\n\n";

echo "MISSING ENVIRONMENT VARIABLES:\n";
echo "==============================\n";
$missingVars = [
    'PAYCHANGU_PUBLIC_KEY',
    'PAYCHANGU_SECRET_KEY', 
    'PAYCHANGU_MERCHANT_ID',
    'PAYCHANGU_WEBHOOK_SECRET',
    'PAYCHANGU_ENVIRONMENT',
    'PAYCHANGU_PAYMENT_URL',
    'PAYCHANGU_VERIFY_URL',
    'PAYCHANGU_CALLBACK_URL',
    'PAYCHANGU_RETURN_URL'
];

foreach ($missingVars as $var) {
    echo "❌ {$var}\n";
}

echo "\nSOLUTION:\n";
echo "=========\n";
echo "1. Add PayChangu environment variables to DigitalOcean\n";
echo "2. Update webhook signature verification logic\n";
echo "3. Test with real PayChangu webhook\n";
echo "4. Deploy to production\n\n";

echo "STEP 1: UPDATED DIGITALOCEAN CONFIG\n";
echo "===================================\n";

$updatedAppYaml = 'name: docavailable-backend
# Force rebuild with new configuration
services:
- name: laravel-backend
  source_dir: /backend
  github:
    repo: docavailable/docavailable
    branch: main
  dockerfile_path: ./Dockerfile
  instance_count: 1
  instance_size_slug: basic-xxs
  http_port: 8080
  run_command: sh -c "cd backend && echo \'=== NEW STARTUP SEQUENCE ===\' && echo \'Starting Laravel application...\' && php artisan config:clear && php artisan cache:clear && echo \'Testing database connection...\' && php artisan tinker --execute=\'DB::connection()->getPdo(); echo \"Database connected successfully\";\' && echo \'Starting server...\' && php artisan serve --host=0.0.0.0 --port=8080"
  envs:
  - key: APP_NAME
    value: DocAvailable
  - key: APP_ENV
    value: production
  - key: APP_DEBUG
    value: false
  - key: APP_URL
    value: ${APP_URL}
  - key: DB_CONNECTION
    value: ${DB_CONNECTION}
  - key: DB_HOST
    value: ${DB_HOST}
  - key: DB_PORT
    value: ${DB_PORT}
  - key: DB_DATABASE
    value: ${DB_DATABASE}
  - key: DB_USERNAME
    value: ${DB_USERNAME}
  - key: DB_PASSWORD
    value: ${DB_PASSWORD}
  - key: DB_URL
    value: ${DB_URL}
  - key: DB_SSLMODE
    value: ${DB_SSLMODE}
  - key: MAIL_MAILER
    value: smtp
  - key: MAIL_HOST
    value: smtp.gmail.com
  - key: MAIL_PORT
    value: "587"
  - key: MAIL_USERNAME
    value: Docavailable01@gmail.com
  - key: MAIL_PASSWORD
    value: sdekzppdxdknhlkd
  - key: MAIL_ENCRYPTION
    value: tls
  - key: MAIL_FROM_ADDRESS
    value: Docavailable01@gmail.com
  - key: MAIL_FROM_NAME
    value: DocAvailable
  # PayChangu Configuration
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

echo $updatedAppYaml . "\n\n";

echo "STEP 2: IMPROVED WEBHOOK SIGNATURE VERIFICATION\n";
echo "==============================================\n";

$improvedWebhookCode = 'public function webhook(Request $request)
{
    try {
        Log::info("Payment webhook received", [
            "headers" => $request->headers->all(),
            "has_signature" => $request->hasHeader("Signature")
        ]);
        
        // Step 1: Get signature and secrets
        $signature = $request->header("Signature");
        $webhookSecret = config("services.paychangu.webhook_secret");
        $apiSecret = config("services.paychangu.secret_key");
        $payload = $request->getContent();
        
        Log::info("Webhook verification details", [
            "has_signature" => !empty($signature),
            "has_webhook_secret" => !empty($webhookSecret),
            "has_api_secret" => !empty($apiSecret),
            "payload_length" => strlen($payload),
            "signature_received" => $signature
        ]);
        
        // Step 2: Validate required data
        if (!$signature) {
            Log::error("Missing signature header");
            return response()->json(["error" => "Missing signature"], 200);
        }
        
        if (!$webhookSecret && !$apiSecret) {
            Log::error("Missing webhook secret and API secret");
            return response()->json(["error" => "Missing webhook configuration"], 200);
        }
        
        // Step 3: Verify signature
        $verified = false;
        $usedSecret = null;
        
        // Try webhook secret first (preferred)
        if ($webhookSecret) {
            $computedSignature = hash_hmac("sha256", $payload, $webhookSecret);
            if (hash_equals($computedSignature, $signature)) {
                $verified = true;
                $usedSecret = "webhook";
                Log::info("Signature verified using webhook secret");
            }
        }
        
        // Fallback to API secret if webhook secret fails
        if (!$verified && $apiSecret) {
            $computedSignature = hash_hmac("sha256", $payload, $apiSecret);
            if (hash_equals($computedSignature, $signature)) {
                $verified = true;
                $usedSecret = "api";
                Log::warning("Signature verified using API secret (fallback)");
            }
        }
        
        if (!$verified) {
            Log::error("Invalid webhook signature", [
                "received_signature" => $signature,
                "has_webhook_secret" => !empty($webhookSecret),
                "has_api_secret" => !empty($apiSecret),
                "payload_preview" => substr($payload, 0, 100) . "..."
            ]);
            return response()->json(["error" => "Invalid signature"], 200);
        }
        
        Log::info("Webhook signature verified successfully", ["used_secret" => $usedSecret]);
        
        // Step 4: Parse webhook data
        $data = $request->all();
        Log::info("Webhook payload parsed", ["data" => $data]);
        
        // Step 5: Check event type
        if (!isset($data["event_type"])) {
            Log::error("Missing event_type in webhook payload", ["data" => $data]);
            return response()->json(["error" => "Missing event_type"], 200);
        }
        
        $event = strtolower(trim($data["event_type"]));
        $allowedEventTypes = ["api.charge.payment", "checkout.payment"];
        
        if (!in_array($event, $allowedEventTypes, true)) {
            Log::info("Unsupported event type", ["event_type" => $data["event_type"]]);
            return response()->json(["message" => "Event type not supported"], 200);
        }
        
        // Step 6: Check payment status
        if ($data["status"] !== "success") {
            Log::info("Payment status not success", ["status" => $data["status"]]);
            return response()->json(["message" => "Payment status not success"], 200);
        }
        
        // Step 7: Parse meta data
        $meta = [];
        if (isset($data["meta"])) {
            if (is_string($data["meta"])) {
                $meta = json_decode($data["meta"], true) ?: [];
            } elseif (is_array($data["meta"])) {
                $meta = $data["meta"];
            }
        }
        
        if (empty($meta["user_id"]) || empty($meta["plan_id"])) {
            Log::error("Missing user_id or plan_id in meta", [
                "data" => $data,
                "meta" => $meta
            ]);
            return response()->json(["error" => "Missing user_id or plan_id in meta data"], 200);
        }
        
        // Step 8: Process successful payment
        Log::info("Processing successful payment", [
            "user_id" => $meta["user_id"],
            "plan_id" => $meta["plan_id"],
            "amount" => $data["amount"],
            "currency" => $data["currency"],
            "transaction_id" => $data["tx_ref"] ?? $data["reference"] ?? null
        ]);
        
        return $this->processSuccessfulPayment($data, $meta);
        
    } catch (Exception $e) {
        Log::error("Webhook processing error", [
            "error" => $e->getMessage(),
            "trace" => $e->getTraceAsString()
        ]);
        return response()->json(["error" => $e->getMessage()], 200);
    }
}';

echo $improvedWebhookCode . "\n\n";

echo "STEP 3: TESTING WITH REAL PAYCHANGU DATA\n";
echo "========================================\n";

// Test with real PayChangu payload
$realPayload = [
    "event_type" => "checkout.payment",
    "status" => "success",
    "amount" => 100,
    "currency" => "MWK",
    "tx_ref" => "TXN_1754923308_13",
    "meta" => "{\"user_id\":13,\"plan_id\":1,\"transaction_id\":98}"
];

echo "Real PayChangu payload:\n";
echo json_encode($realPayload, JSON_PRETTY_PRINT) . "\n\n";

echo "STEP 4: DEPLOYMENT INSTRUCTIONS\n";
echo "==============================\n";
echo "1. Update .do/app.yaml with PayChangu environment variables\n";
echo "2. Set PayChangu secrets in DigitalOcean environment variables\n";
echo "3. Update PaymentController webhook method\n";
echo "4. Deploy to production\n";
echo "5. Test webhook with real PayChangu data\n\n";

echo "IMMEDIATE ACTION REQUIRED:\n";
echo "==========================\n";
echo "1. Add PayChangu environment variables to DigitalOcean\n";
echo "2. Update the webhook code with improved signature verification\n";
echo "3. Deploy to production\n";
echo "4. Test with real webhook\n\n";

echo "This will fix your payment processing immediately!\n";
