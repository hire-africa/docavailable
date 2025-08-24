<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

echo "📋 Adding Plans Directly to Database...\n";
echo "=====================================\n\n";

// Test database connection first
echo "1️⃣ Testing database connection...\n";
try {
    $pdo = DB::connection()->getPdo();
    echo "   ✅ Database connection successful\n";
    echo "   📊 Database: " . DB::connection()->getDatabaseName() . "\n\n";
} catch (Exception $e) {
    echo "   ❌ Database connection failed: " . $e->getMessage() . "\n\n";
    exit(1);
}

// First, let's check what's in the plans table
echo "2️⃣ Checking current plans table...\n";
try {
    $plans = DB::select("SELECT * FROM plans");
    echo "   📊 Current plans in database: " . count($plans) . "\n";
    
    if (count($plans) > 0) {
        echo "   📋 Existing plans:\n";
        foreach ($plans as $plan) {
            echo "      - ID {$plan->id}: {$plan->name} (\${$plan->price})\n";
        }
    }
    echo "\n";
} catch (Exception $e) {
    echo "   ❌ Error checking plans: " . $e->getMessage() . "\n\n";
    exit(1);
}

// Clear existing plans and start fresh
echo "3️⃣ Clearing existing plans...\n";
try {
    DB::statement("DELETE FROM plans");
    echo "   ✅ Cleared all existing plans\n\n";
} catch (Exception $e) {
    echo "   ❌ Error clearing plans: " . $e->getMessage() . "\n\n";
    exit(1);
}

// Add plans directly with raw SQL
echo "4️⃣ Adding plans directly...\n";
try {
    $plansToAdd = [
        [
            'name' => 'Basic Plan',
            'description' => 'Basic consultation plan with limited features',
            'price' => 9.99,
            'currency' => 'USD',
            'duration_days' => 30,
            'features' => '{"consultations": 5, "text_sessions": 10, "voice_calls": 2, "video_calls": 1, "health_records": false, "priority_support": false}',
            'is_active' => true
        ],
        [
            'name' => 'Standard Plan',
            'description' => 'Standard consultation plan with balanced features',
            'price' => 19.99,
            'currency' => 'USD',
            'duration_days' => 30,
            'features' => '{"consultations": 15, "text_sessions": 30, "voice_calls": 5, "video_calls": 3, "health_records": true, "priority_support": false}',
            'is_active' => true
        ],
        [
            'name' => 'Premium Plan',
            'description' => 'Premium consultation plan with all features',
            'price' => 39.99,
            'currency' => 'USD',
            'duration_days' => 30,
            'features' => '{"consultations": 30, "text_sessions": 60, "voice_calls": 10, "video_calls": 5, "health_records": true, "priority_support": true}',
            'is_active' => true
        ],
        [
            'name' => 'Doctor Basic',
            'description' => 'Basic plan for doctors',
            'price' => 29.99,
            'currency' => 'USD',
            'duration_days' => 30,
            'features' => '{"patient_consultations": 20, "earnings_percentage": 70, "analytics": false, "priority_listing": false}',
            'is_active' => true
        ],
        [
            'name' => 'Doctor Premium',
            'description' => 'Premium plan for doctors with advanced features',
            'price' => 59.99,
            'currency' => 'USD',
            'duration_days' => 30,
            'features' => '{"patient_consultations": 50, "earnings_percentage": 80, "analytics": true, "priority_listing": true}',
            'is_active' => true
        ]
    ];
    
    foreach ($plansToAdd as $plan) {
        $sql = "INSERT INTO plans (name, description, price, currency, duration_days, features, is_active, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
        
        DB::insert($sql, [
            $plan['name'],
            $plan['description'],
            $plan['price'],
            $plan['currency'],
            $plan['duration_days'],
            $plan['features'],
            $plan['is_active']
        ]);
        
        echo "   ✅ Added: {$plan['name']} (\${$plan['price']})\n";
    }
    
    echo "\n   📊 Successfully added " . count($plansToAdd) . " plans\n\n";
    
} catch (Exception $e) {
    echo "   ❌ Error adding plans: " . $e->getMessage() . "\n\n";
    exit(1);
}

// Verify the results
echo "5️⃣ Verifying plans were added...\n";
try {
    $finalPlans = DB::select("SELECT * FROM plans ORDER BY id");
    echo "   📊 Total plans in database: " . count($finalPlans) . "\n\n";
    
    echo "   📋 All plans:\n";
    foreach ($finalPlans as $plan) {
        echo "      - ID {$plan->id}: {$plan->name} - \${$plan->price} ({$plan->duration_days} days)\n";
        echo "        Description: {$plan->description}\n";
        echo "        Features: {$plan->features}\n";
        echo "        Active: " . ($plan->is_active ? 'Yes' : 'No') . "\n";
        echo "\n";
    }
    
} catch (Exception $e) {
    echo "   ❌ Error verifying plans: " . $e->getMessage() . "\n";
}

echo "📋 Plans added successfully!\n";
echo "💡 The webhook system should now work properly with all required plans.\n";
