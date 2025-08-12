<?php

require_once __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;
use App\Models\Subscription;
use App\Models\Plan;
use App\Http\Controllers\PaymentController;
use Illuminate\Http\Request;

echo "🧪 Testing Subscription Disappearance Scenario...\n\n";

// 1. Create a test user if needed
$user = User::where('user_type', 'patient')->first();
if (!$user) {
    echo "❌ No patient user found\n";
    exit(1);
}

echo "Using user: {$user->email} (ID: {$user->id})\n";

// 2. Check current subscription count
$initialCount = Subscription::count();
echo "Initial subscription count: {$initialCount}\n";

// 3. Simulate webhook data that might cause issues
echo "\n📋 Testing different webhook scenarios...\n";

// Scenario 1: Webhook with plan_id
echo "\nScenario 1: Webhook with plan_id\n";
$webhookData1 = [
    'transaction_id' => 'TEST_DISAPPEAR_' . time() . '_1',
    'reference' => 'TEST_REF_' . time() . '_1',
    'amount' => 100.00,
    'currency' => 'MWK',
    'status' => 'completed',
    'phone_number' => '+265123456789',
    'payment_method' => 'mobile_money',
    'payment_channel' => 'Mobile Money',
    'name' => 'Test User',
    'email' => 'test@example.com',
    'paid_at' => date('Y-m-d H:i:s'),
    'meta' => [
        'user_id' => $user->id,
        'plan_id' => 1,
    ]
];

try {
    $request1 = new Request($webhookData1);
    $controller = new PaymentController();
    $response1 = $controller->webhook($request1);
    
    $responseData1 = json_decode($response1->getContent(), true);
    echo "Response: " . json_encode($responseData1, JSON_PRETTY_PRINT) . "\n";
    
    if (isset($responseData1['success']) && $responseData1['success']) {
        echo "✅ Scenario 1: Subscription created successfully\n";
    } else {
        echo "❌ Scenario 1: Failed to create subscription\n";
    }
} catch (Exception $e) {
    echo "❌ Scenario 1: Error - " . $e->getMessage() . "\n";
}

// Check subscription count after scenario 1
$countAfter1 = Subscription::count();
echo "Subscription count after scenario 1: {$countAfter1}\n";

// Scenario 2: Webhook without plan_id (amount mapping)
echo "\nScenario 2: Webhook without plan_id (amount mapping)\n";
$webhookData2 = [
    'transaction_id' => 'TEST_DISAPPEAR_' . time() . '_2',
    'reference' => 'TEST_REF_' . time() . '_2',
    'amount' => 100.00,
    'currency' => 'MWK',
    'status' => 'completed',
    'phone_number' => '+265123456789',
    'payment_method' => 'mobile_money',
    'payment_channel' => 'Mobile Money',
    'name' => 'Test User',
    'email' => 'test@example.com',
    'paid_at' => date('Y-m-d H:i:s'),
    'meta' => [
        'user_id' => $user->id,
        // No plan_id - this should trigger amount mapping
    ]
];

try {
    $request2 = new Request($webhookData2);
    $response2 = $controller->webhook($request2);
    
    $responseData2 = json_decode($response2->getContent(), true);
    echo "Response: " . json_encode($responseData2, JSON_PRETTY_PRINT) . "\n";
    
    if (isset($responseData2['success']) && $responseData2['success']) {
        echo "✅ Scenario 2: Subscription created successfully\n";
    } else {
        echo "❌ Scenario 2: Failed to create subscription\n";
    }
} catch (Exception $e) {
    echo "❌ Scenario 2: Error - " . $e->getMessage() . "\n";
}

// Check subscription count after scenario 2
$countAfter2 = Subscription::count();
echo "Subscription count after scenario 2: {$countAfter2}\n";

// 4. Check if any subscriptions were created
echo "\n📊 Final subscription check:\n";
$finalSubscriptions = Subscription::where('user_id', $user->id)->get();
echo "Total subscriptions for user: " . $finalSubscriptions->count() . "\n";

foreach ($finalSubscriptions as $sub) {
    echo "  - ID: {$sub->id}, Plan: {$sub->plan_id}, Active: " . ($sub->is_active ? 'Yes' : 'No') . ", Status: {$sub->status}\n";
}

// 5. Wait a moment and check again (simulate the "disappearing" issue)
echo "\n⏱️ Waiting 5 seconds to check for disappearance...\n";
sleep(5);

$finalCheck = Subscription::where('user_id', $user->id)->get();
echo "Subscriptions after 5 seconds: " . $finalCheck->count() . "\n";

if ($finalCheck->count() < $finalSubscriptions->count()) {
    echo "❌ SUBSCRIPTIONS DISAPPEARED!\n";
    $disappearedIds = $finalSubscriptions->pluck('id')->diff($finalCheck->pluck('id'));
    foreach ($disappearedIds as $id) {
        echo "  - Subscription ID {$id} disappeared\n";
    }
} else {
    echo "✅ No subscriptions disappeared\n";
}

echo "\n✅ Test complete!\n";

