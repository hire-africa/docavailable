<?php

// Check current plans and their prices
require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Plan;

echo "Current plans in database:\n";
echo "========================\n";

try {
    $plans = Plan::all();
    
    if ($plans->count() === 0) {
        echo "❌ No plans found in database!\n";
    } else {
        foreach ($plans as $plan) {
            echo "Plan ID: " . $plan->id . "\n";
            echo "Name: " . $plan->name . "\n";
            echo "Price: " . $plan->price . " " . $plan->currency . "\n";
            echo "Duration: " . $plan->duration . " days\n";
            echo "Text Sessions: " . $plan->text_sessions . "\n";
            echo "Voice Calls: " . $plan->voice_calls . "\n";
            echo "Video Calls: " . $plan->video_calls . "\n";
            echo "Status: " . $plan->status . "\n";
            echo "---\n";
        }
    }
    
    // Check if plan_id = 1 exists
    $plan1 = Plan::find(1);
    if ($plan1) {
        echo "✅ Plan ID 1 exists:\n";
        echo "   Name: " . $plan1->name . "\n";
        echo "   Price: " . $plan1->price . " " . $plan1->currency . "\n";
    } else {
        echo "❌ Plan ID 1 does not exist!\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error checking plans: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
} 