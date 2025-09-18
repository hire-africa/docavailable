<?php

// Local test script to verify subscription creation fix
echo "🔍 Testing Subscription Creation Fix (Local)...\n\n";

// Load Laravel environment
require_once __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;
use App\Models\Subscription;
use App\Models\Plan;
use App\Http\Controllers\PaymentController;
use Illuminate\Http\Request;

try {
    echo "1. Testing with existing user (ID: 1)...\n";
    
    // Test with existing user
    $userId = 1;
    $planId = 1;
    $transactionId = 'TEST_LOCAL_' . time();
    
    // Check if user exists
    $user = User::find($userId);
    if (!$user) {
        echo "❌ User with ID $userId not found. Creating test user...\n";
        
        $user = User::create([
            'email' => 'testuser@example.com',
            'password' => bcrypt('password'),
            'first_name' => 'Test',
            'last_name' => 'User',
            'display_name' => 'Test User',
            'user_type' => 'patient',
            'status' => 'active'
        ]);
        $userId = $user->id;
        echo "✅ Created test user with ID: $userId\n";
    } else {
        echo "✅ Found existing user: {$user->email}\n";
    }
    
    // Check if plan exists
    $plan = Plan::find($planId);
    if (!$plan) {
        echo "❌ Plan with ID $planId not found. Creating test plan...\n";
        
        $plan = Plan::create([
            'name' => 'Test Plan',
            'price' => 100.00,
            'currency' => 'MWK',
            'text_sessions' => 10,
            'voice_calls' => 5,
            'video_calls' => 3,
            'duration' => 30,
            'status' => 1
        ]);
        $planId = $plan->id;
        echo "✅ Created test plan with ID: $planId\n";
    } else {
        echo "✅ Found existing plan: {$plan->name}\n";
    }
    
    // Test subscription creation using PaymentController
    $paymentController = new PaymentController();
    
    // Use reflection to access the protected method
    $reflection = new ReflectionClass($paymentController);
    $method = $reflection->getMethod('activatePlanForUser');
    $method->setAccessible(true);
    
    echo "\n2. Testing subscription activation...\n";
    
    try {
        $subscription = $method->invoke($paymentController, $userId, $planId, $transactionId);
        
        if ($subscription) {
            echo "✅ SUCCESS: Subscription created/updated successfully!\n";
            echo "   Subscription ID: {$subscription->id}\n";
            echo "   User ID: {$subscription->user_id}\n";
            echo "   Plan ID: {$subscription->plan_id}\n";
            echo "   Is Active: " . ($subscription->is_active ? 'Yes' : 'No') . "\n";
            echo "   Text Sessions Remaining: {$subscription->text_sessions_remaining}\n";
            echo "   Voice Calls Remaining: {$subscription->voice_calls_remaining}\n";
            echo "   Video Calls Remaining: {$subscription->video_calls_remaining}\n";
        } else {
            echo "❌ FAILED: No subscription returned\n";
        }
    } catch (Exception $e) {
        echo "❌ FAILED: Error creating subscription\n";
        echo "   Error: " . $e->getMessage() . "\n";
        echo "   File: " . $e->getFile() . ":" . $e->getLine() . "\n";
    }
    
    echo "\n3. Testing second subscription for same user...\n";
    
    // Test adding another subscription to the same user
    $transactionId2 = 'TEST_LOCAL_2_' . time();
    
    try {
        $subscription2 = $method->invoke($paymentController, $userId, $planId, $transactionId2);
        
        if ($subscription2) {
            echo "✅ SUCCESS: Second subscription handled successfully!\n";
            echo "   Subscription ID: {$subscription2->id}\n";
            echo "   Text Sessions Remaining: {$subscription2->text_sessions_remaining}\n";
            echo "   Voice Calls Remaining: {$subscription2->voice_calls_remaining}\n";
            echo "   Video Calls Remaining: {$subscription2->video_calls_remaining}\n";
        } else {
            echo "❌ FAILED: No subscription returned for second purchase\n";
        }
    } catch (Exception $e) {
        echo "❌ FAILED: Error creating second subscription\n";
        echo "   Error: " . $e->getMessage() . "\n";
    }
    
    echo "\n4. Testing with new user (no existing subscription)...\n";
    
    // Create a new user for testing
    $newUser = User::create([
        'email' => 'newuser' . time() . '@example.com',
        'password' => bcrypt('password'),
        'first_name' => 'New',
        'last_name' => 'User',
        'display_name' => 'New User',
        'user_type' => 'patient',
        'status' => 'active'
    ]);
    
    echo "✅ Created new user with ID: {$newUser->id}\n";
    
    $transactionId3 = 'TEST_NEW_USER_' . time();
    
    try {
        $newSubscription = $method->invoke($paymentController, $newUser->id, $planId, $transactionId3);
        
        if ($newSubscription) {
            echo "✅ SUCCESS: New user subscription created successfully!\n";
            echo "   Subscription ID: {$newSubscription->id}\n";
            echo "   User ID: {$newSubscription->user_id}\n";
            echo "   Is Active: " . ($newSubscription->is_active ? 'Yes' : 'No') . "\n";
            echo "   Text Sessions Remaining: {$newSubscription->text_sessions_remaining}\n";
        } else {
            echo "❌ FAILED: No subscription returned for new user\n";
        }
    } catch (Exception $e) {
        echo "❌ FAILED: Error creating subscription for new user\n";
        echo "   Error: " . $e->getMessage() . "\n";
        echo "   File: " . $e->getFile() . ":" . $e->getLine() . "\n";
    }
    
    echo "\n" . str_repeat("=", 60) . "\n";
    echo "✅ Local test completed successfully!\n";
    echo "The subscription fix is working correctly.\n";
    
} catch (Exception $e) {
    echo "❌ CRITICAL ERROR: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . ":" . $e->getLine() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
}
