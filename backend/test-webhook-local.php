<?php

/**
 * Test Webhook Processing Locally
 * This script simulates a PayChangu webhook for local testing
 */

require_once 'vendor/autoload.php';

use App\Http\Controllers\PaymentController;
use Illuminate\Http\Request;

echo "🧪 TESTING WEBHOOK PROCESSING LOCALLY\n";
echo "=====================================\n\n";

try {
    // Initialize Laravel app
    $app = require_once 'bootstrap/app.php';
    $app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
    
    echo "✅ Laravel app initialized\n\n";
    
    // Create test webhook data
    $webhookData = [
        'event_type' => 'api.charge.payment',
        'currency' => 'MWK',
        'amount' => 100,
        'charge' => '20',
        'mode' => 'test',
        'type' => 'Direct API Payment',
        'status' => 'success',
        'charge_id' => 'test_' . time(),
        'reference' => 'TEST_' . time(),
        'authorization' => [
            'channel' => 'Mobile Money',
            'completed_at' => now()->toISOString()
        ],
        'created_at' => now()->toISOString(),
        'updated_at' => now()->toISOString(),
        'meta' => json_encode([
            'user_id' => 1,
            'plan_id' => 4
        ])
    ];
    
    echo "Test webhook data:\n";
    echo json_encode($webhookData, JSON_PRETTY_PRINT) . "\n\n";
    
    // Create request
    $request = new Request($webhookData);
    
    // Test webhook processing
    $controller = new PaymentController();
    $response = $controller->webhook($request);
    
    echo "Response status: " . $response->getStatusCode() . "\n";
    echo "Response body:\n";
    echo $response->getContent() . "\n\n";
    
    if ($response->getStatusCode() === 200) {
        echo "✅ Webhook processing successful!\n";
    } else {
        echo "❌ Webhook processing failed\n";
    }
    
} catch (\Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
