<?php

require __DIR__.'/vendor/autoload.php';
require __DIR__.'/bootstrap/app.php';

use Illuminate\Support\Facades\DB;
use App\Models\Plan;
use App\Models\User;

echo "🔍 Testing Database Connection and Plan Existence...\n\n";

try {
    // Test database connection
    DB::connection()->getPdo();
    echo "✅ Database connection successful!\n\n";
    
    // Check if test plan exists
    $planId = 5; // Plan ID from webhook test data
    $plan = Plan::find($planId);
    
    if ($plan) {
        echo "✅ Test plan found:\n";
        print_r($plan->toArray());
    } else {
        echo "❌ Test plan (ID: {$planId}) not found!\n";
        echo "Creating test plan...\n";
        
        // Create test plan if it doesn't exist
        $plan = new Plan();
        $plan->id = $planId;
        $plan->name = 'Basic Life';
        $plan->price = 100;
        $plan->currency = 'MWK';
        $plan->duration = 30;
        $plan->text_sessions = 10;
        $plan->voice_calls = 5;
        $plan->video_calls = 2;
        $plan->save();
        
        echo "✅ Test plan created successfully!\n";
    }
    
    // Check if test user exists
    $userId = 11; // User ID from webhook test data
    $user = User::find($userId);
    
    if ($user) {
        echo "✅ Test user found:\n";
        print_r([
            'id' => $user->id,
            'email' => $user->email,
            'name' => $user->name
        ]);
    } else {
        echo "❌ Test user (ID: {$userId}) not found!\n";
        echo "Please ensure test user exists before running webhook test.\n";
    }
    
} catch (Exception $e) {
    echo "❌ Database connection failed!\n";
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
