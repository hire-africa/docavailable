<?php

/**
 * Test Webhook with Environment Variables
 * Test the current webhook implementation with proper PayChangu environment variables
 */

require_once 'vendor/autoload.php';

use App\Http\Controllers\PaymentController;
use Illuminate\Http\Request;

echo "🧪 TESTING WEBHOOK WITH ENVIRONMENT VARIABLES\n";
echo "=============================================\n\n";

try {
    // Initialize Laravel app
    $app = require_once 'bootstrap/app.php';
    $app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
    
    echo "✅ Laravel app initialized\n\n";
    
    // Check current PayChangu configuration
    echo "1. CHECKING PAYCHANGU CONFIGURATION:\n";
    echo "====================================\n";
    
    $config = [
        'webhook_secret' => config('services.paychangu.webhook_secret'),
        'secret_key' => config('services.paychangu.secret_key'),
        'public_key' => config('services.paychangu.public_key'),
        'merchant_id' => config('services.paychangu.merchant_id'),
        'environment' => config('services.paychangu.environment'),
    ];
    
    foreach ($config as $key => $value) {
        $status = !empty($value) ? '✅ SET' : '❌ MISSING';
        $displayValue = !empty($value) ? (strlen($value) > 20 ? substr($value, 0, 20) . '...' : $value) : 'NOT SET';
        echo "{$key}: {$status} - {$displayValue}\n";
    }
    
    echo "\n2. TESTING WITH REAL PAYCHANGU PAYLOAD:\n";
    echo "======================================\n";
    
    // Real PayChangu webhook payload
    $realPayload = [
        "event_type" => "checkout.payment",
        "first_name" => "Jsjdjd",
        "last_name" => "djdjd",
        "email" => "josa@gmail.com",
        "currency" => "MWK",
        "amount" => 100,
        "charge" => 3,
        "amount_split" => [
            "fee_paid_by_customer" => 0,
            "fee_paid_by_merchant" => 3,
            "total_amount_paid_by_customer" => 100,
            "amount_received_by_merchant" => 97
        ],
        "total_amount_paid" => 100,
        "mode" => "live",
        "type" => "API Payment (Checkout)",
        "status" => "success",
        "reference" => "66806395246",
        "tx_ref" => "TXN_1754923308_13",
        "customization" => [
            "title" => "DocAvailable Payment",
            "description" => "Payment for medical consultation services",
            "logo" => null
        ],
        "meta" => "{\"user_id\":13,\"plan_id\":1,\"transaction_id\":98}",
        "customer" => [
            "customer_ref" => "cs_ddb89e13614e8fe",
            "email" => "josa@gmail.com",
            "first_name" => "Jsjdjd",
            "last_name" => "djdjd",
            "phone" => "980794099",
            "created_at" => 1754670159
        ],
        "authorization" => [
            "channel" => "Mobile Money",
            "card_details" => null,
            "bank_payment_details" => null,
            "mobile_money" => [
                "mobile_number" => "+265980xxxx99",
                "operator" => "Airtel Money",
                "trans_id" => null
            ],
            "completed_at" => null
        ],
        "created_at" => "2025-08-11T14:42:43.000000Z",
        "updated_at" => "2025-08-11T14:43:02.000000Z"
    ];
    
    echo "Payload: " . json_encode($realPayload, JSON_PRETTY_PRINT) . "\n\n";
    
    // Test signature generation (simulate what PayChangu would send)
    $payload = json_encode($realPayload);
    $webhookSecret = config('services.paychangu.webhook_secret');
    $apiSecret = config('services.paychangu.secret_key');
    
    echo "3. TESTING SIGNATURE VERIFICATION:\n";
    echo "==================================\n";
    
    if ($webhookSecret) {
        $computedSignature = hash_hmac('sha256', $payload, $webhookSecret);
        echo "✅ Webhook secret available\n";
        echo "Computed signature: {$computedSignature}\n";
    } else {
        echo "❌ Webhook secret missing\n";
    }
    
    if ($apiSecret) {
        $computedApiSignature = hash_hmac('sha256', $payload, $apiSecret);
        echo "✅ API secret available\n";
        echo "Computed API signature: {$computedApiSignature}\n";
    } else {
        echo "❌ API secret missing\n";
    }
    
    if (!$webhookSecret && !$apiSecret) {
        echo "\n❌ NO SECRETS CONFIGURED!\n";
        echo "This is why webhook signature verification is failing.\n";
        echo "You need to set PayChangu environment variables in DigitalOcean.\n\n";
        
        echo "REQUIRED ENVIRONMENT VARIABLES:\n";
        echo "==============================\n";
        echo "PAYCHANGU_WEBHOOK_SECRET=your_webhook_secret_here\n";
        echo "PAYCHANGU_SECRET_KEY=your_api_secret_here\n";
        echo "PAYCHANGU_PUBLIC_KEY=your_public_key_here\n";
        echo "PAYCHANGU_MERCHANT_ID=your_merchant_id_here\n\n";
        
        echo "NEXT STEPS:\n";
        echo "===========\n";
        echo "1. Go to DigitalOcean App Platform\n";
        echo "2. Navigate to your app settings\n";
        echo "3. Go to Environment Variables section\n";
        echo "4. Add the PayChangu environment variables\n";
        echo "5. Redeploy your app\n";
        echo "6. Test webhook again\n\n";
        
        exit(1);
    }
    
    // Test webhook processing with proper signature
    echo "\n4. TESTING WEBHOOK PROCESSING:\n";
    echo "=============================\n";
    
    $request = new Request($realPayload);
    $request->headers->set('Content-Type', 'application/json');
    
    // Use the computed signature
    if ($webhookSecret) {
        $signature = hash_hmac('sha256', $payload, $webhookSecret);
        $request->headers->set('Signature', $signature);
        echo "Using webhook secret signature: {$signature}\n";
    } else {
        $signature = hash_hmac('sha256', $payload, $apiSecret);
        $request->headers->set('Signature', $signature);
        echo "Using API secret signature: {$signature}\n";
    }
    
    $controller = new PaymentController();
    
    echo "Sending webhook request...\n";
    $response = $controller->webhook($request);
    
    echo "Response Status: " . $response->getStatusCode() . "\n";
    $responseData = json_decode($response->getContent(), true);
    echo "Response: " . json_encode($responseData, JSON_PRETTY_PRINT) . "\n\n";
    
    if ($response->getStatusCode() === 200 && !isset($responseData['error'])) {
        echo "✅ WEBHOOK PROCESSING SUCCESSFUL!\n";
        echo "Your payment system should work correctly now.\n";
    } else {
        echo "❌ WEBHOOK PROCESSING FAILED\n";
        echo "Check the error message above for details.\n";
    }
    
    echo "\n5. PRODUCTION TEST:\n";
    echo "==================\n";
    
    $productionUrl = 'https://docavailable-3vbdv.ondigitalocean.app/api/payments/webhook';
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $productionUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Signature: ' . $signature
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    
    $productionResponse = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    echo "Production Response:\n";
    echo "- HTTP Code: {$httpCode}\n";
    echo "- Response: {$productionResponse}\n";
    if ($curlError) {
        echo "- Error: {$curlError}\n";
    }
    
    echo "\n🎉 TEST COMPLETED\n";
    echo "================\n";
    
} catch (\Exception $e) {
    echo "❌ Test failed: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
