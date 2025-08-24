<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

echo "📋 Adding Correct Plans to Database...\n";
echo "====================================\n\n";

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

// Clear existing plans and start fresh
echo "2️⃣ Clearing existing plans...\n";
try {
    DB::statement("DELETE FROM plans");
    echo "   ✅ Cleared all existing plans\n\n";
} catch (Exception $e) {
    echo "   ❌ Error clearing plans: " . $e->getMessage() . "\n\n";
    exit(1);
}

// Add the correct plans with both USD and MWK currencies
echo "3️⃣ Adding correct plans...\n";
try {
    $plansToAdd = [
        // USD Plans
        [
            'name' => 'Basic Life',
            'description' => 'Basic life consultation plan',
            'price' => 9.99,
            'currency' => 'USD',
            'duration_days' => 30,
            'features' => '{"consultations": 5, "text_sessions": 10, "voice_calls": 2, "video_calls": 1, "health_records": false, "priority_support": false}',
            'is_active' => true
        ],
        [
            'name' => 'Executive Life',
            'description' => 'Executive life consultation plan',
            'price' => 19.99,
            'currency' => 'USD',
            'duration_days' => 30,
            'features' => '{"consultations": 15, "text_sessions": 30, "voice_calls": 5, "video_calls": 3, "health_records": true, "priority_support": false}',
            'is_active' => true
        ],
        [
            'name' => 'Premium Life',
            'description' => 'Premium life consultation plan',
            'price' => 39.99,
            'currency' => 'USD',
            'duration_days' => 30,
            'features' => '{"consultations": 30, "text_sessions": 60, "voice_calls": 10, "video_calls": 5, "health_records": true, "priority_support": true}',
            'is_active' => true
        ],
        
        // MWK Plans
        [
            'name' => 'Basic Life',
            'description' => 'Basic life consultation plan',
            'price' => 15000.00,
            'currency' => 'MWK',
            'duration_days' => 30,
            'features' => '{"consultations": 5, "text_sessions": 10, "voice_calls": 2, "video_calls": 1, "health_records": false, "priority_support": false}',
            'is_active' => true
        ],
        [
            'name' => 'Executive Life',
            'description' => 'Executive life consultation plan',
            'price' => 30000.00,
            'currency' => 'MWK',
            'duration_days' => 30,
            'features' => '{"consultations": 15, "text_sessions": 30, "voice_calls": 5, "video_calls": 3, "health_records": true, "priority_support": false}',
            'is_active' => true
        ],
        [
            'name' => 'Premium Life',
            'description' => 'Premium life consultation plan',
            'price' => 60000.00,
            'currency' => 'MWK',
            'duration_days' => 30,
            'features' => '{"consultations": 30, "text_sessions": 60, "voice_calls": 10, "video_calls": 5, "health_records": true, "priority_support": true}',
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
        
        echo "   ✅ Added: {$plan['name']} ({$plan['currency']} {$plan['price']})\n";
    }
    
    echo "\n   📊 Successfully added " . count($plansToAdd) . " plans\n\n";
    
} catch (Exception $e) {
    echo "   ❌ Error adding plans: " . $e->getMessage() . "\n\n";
    exit(1);
}

// Verify the results
echo "4️⃣ Verifying plans were added...\n";
try {
    $finalPlans = DB::select("SELECT * FROM plans ORDER BY currency, name");
    echo "   📊 Total plans in database: " . count($finalPlans) . "\n\n";
    
    echo "   📋 All plans:\n";
    $currentCurrency = '';
    foreach ($finalPlans as $plan) {
        if ($plan->currency !== $currentCurrency) {
            echo "\n   💰 {$plan->currency} Plans:\n";
            $currentCurrency = $plan->currency;
        }
        echo "      - ID {$plan->id}: {$plan->name} - {$plan->currency} {$plan->price} ({$plan->duration_days} days)\n";
        echo "        Description: {$plan->description}\n";
        echo "        Features: {$plan->features}\n";
        echo "        Active: " . ($plan->is_active ? 'Yes' : 'No') . "\n";
        echo "\n";
    }
    
} catch (Exception $e) {
    echo "   ❌ Error verifying plans: " . $e->getMessage() . "\n";
}

echo "📋 Correct plans added successfully!\n";
echo "💡 The webhook system should now work properly with the correct plans.\n";
