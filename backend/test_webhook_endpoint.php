<?php

/**
 * Test webhook endpoint using the test webhook route
 * This tests the actual webhook processing without signature verification
 */

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Http\Request;

echo "=== Paychangu Webhook Endpoint Test ===\n\n";

// Test data matching Paychangu's webhook format
$testData = [
    'user_id' => 11,
    'plan_id' => 1,
    'currency' => 'MWK',
    'amount' => 1000
];

echo "Testing with data:\n";
echo json_encode($testData, JSON_PRETTY_PRINT) . "\n\n";

// Create a test request
$request = new Request($testData);

try {
    // Get the test webhook route
    $router = app('router');
    
    // Find the test webhook route
    $testWebhookRoute = null;
    foreach ($router->getRoutes() as $route) {
        if ($route->uri() === 'api/payments/test-webhook') {
            $testWebhookRoute = $route;
            break;
        }
    }
    
    if (!$testWebhookRoute) {
        echo "❌ Test webhook route not found\n";
        exit(1);
    }
    
    // Dispatch the request to the test webhook route
    $response = $router->dispatch($request);
    
    $responseData = json_decode($response->getContent(), true);
    $statusCode = $response->getStatusCode();
    
    echo "Response Status: $statusCode\n";
    echo "Response: " . json_encode($responseData, JSON_PRETTY_PRINT) . "\n\n";
    
    if ($statusCode === 200 && isset($responseData['success']) && $responseData['success']) {
        echo "✅ Webhook endpoint test passed - subscription created successfully\n";
        
        // Check if subscription was actually created
        $subscription = \App\Models\Subscription::where('user_id', 11)
            ->where('status', 1)
            ->latest()
            ->first();
            
        if ($subscription) {
            echo "✅ Subscription found in database:\n";
            echo "   ID: " . $subscription->id . "\n";
            echo "   User ID: " . $subscription->user_id . "\n";
            echo "   Plan ID: " . $subscription->plan_id . "\n";
            echo "   Status: " . $subscription->status . "\n";
            echo "   Start Date: " . $subscription->start_date . "\n";
            echo "   End Date: " . $subscription->end_date . "\n";
            
            // Show payment metadata
            if ($subscription->payment_metadata) {
                echo "   Payment Metadata: " . json_encode($subscription->payment_metadata, JSON_PRETTY_PRINT) . "\n";
            }
        } else {
            echo "❌ Subscription not found in database\n";
        }
    } else {
        echo "❌ Webhook endpoint test failed\n";
    }
    
} catch (Exception $e) {
    echo "❌ Webhook endpoint test error: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
}

echo "\n=== Test Complete ===\n";
