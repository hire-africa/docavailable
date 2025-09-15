<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

echo "🔧 Fixing Plans Price Column...\n";
echo "==============================\n\n";

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

// Fix the price column type
echo "2️⃣ Fixing price column type...\n";
try {
    // Change price column from integer to decimal
    DB::statement("ALTER TABLE plans ALTER COLUMN price TYPE DECIMAL(10,2)");
    echo "   ✅ Changed price column to DECIMAL(10,2)\n\n";
} catch (Exception $e) {
    echo "   ❌ Error changing price column: " . $e->getMessage() . "\n\n";
    exit(1);
}

// Update the existing Basic Plan with correct price
echo "3️⃣ Updating existing Basic Plan...\n";
try {
    DB::table('plans')->where('name', 'Basic Plan')->update([
        'price' => 9.99,
        'description' => 'Basic consultation plan with limited features',
        'currency' => 'USD',
        'duration_days' => 30,
        'features' => json_encode([
            'consultations' => 5,
            'text_sessions' => 10,
            'voice_calls' => 2,
            'video_calls' => 1,
            'health_records' => false,
            'priority_support' => false
        ]),
        'is_active' => true
    ]);
    echo "   ✅ Updated Basic Plan with correct price (\$9.99)\n\n";
} catch (Exception $e) {
    echo "   ❌ Error updating Basic Plan: " . $e->getMessage() . "\n\n";
    exit(1);
}

// Add the missing plans
echo "4️⃣ Adding missing plans...\n";
try {
    $requiredPlans = [
        [
            'name' => 'Standard Plan',
            'description' => 'Standard consultation plan with balanced features',
            'price' => 19.99,
            'currency' => 'USD',
            'duration_days' => 30,
            'features' => json_encode([
                'consultations' => 15,
                'text_sessions' => 30,
                'voice_calls' => 5,
                'video_calls' => 3,
                'health_records' => true,
                'priority_support' => false
            ]),
            'is_active' => true
        ],
        [
            'name' => 'Premium Plan',
            'description' => 'Premium consultation plan with all features',
            'price' => 39.99,
            'currency' => 'USD',
            'duration_days' => 30,
            'features' => json_encode([
                'consultations' => 30,
                'text_sessions' => 60,
                'voice_calls' => 10,
                'video_calls' => 5,
                'health_records' => true,
                'priority_support' => true
            ]),
            'is_active' => true
        ],
        [
            'name' => 'Doctor Basic',
            'description' => 'Basic plan for doctors',
            'price' => 29.99,
            'currency' => 'USD',
            'duration_days' => 30,
            'features' => json_encode([
                'patient_consultations' => 20,
                'earnings_percentage' => 70,
                'analytics' => false,
                'priority_listing' => false
            ]),
            'is_active' => true
        ],
        [
            'name' => 'Doctor Premium',
            'description' => 'Premium plan for doctors with advanced features',
            'price' => 59.99,
            'currency' => 'USD',
            'duration_days' => 30,
            'features' => json_encode([
                'patient_consultations' => 50,
                'earnings_percentage' => 80,
                'analytics' => true,
                'priority_listing' => true
            ]),
            'is_active' => true
        ]
    ];
    
    $addedPlans = 0;
    foreach ($requiredPlans as $plan) {
        // Check if plan already exists by name
        $exists = DB::table('plans')->where('name', $plan['name'])->exists();
        
        if (!$exists) {
            DB::table('plans')->insert($plan);
            echo "   ✅ Added plan: {$plan['name']} (\${$plan['price']})\n";
            $addedPlans++;
        } else {
            echo "   ⏭️ Plan already exists: {$plan['name']}\n";
        }
    }
    
    echo "\n   📊 Successfully added $addedPlans new plans\n\n";
    
} catch (Exception $e) {
    echo "   ❌ Error adding plans: " . $e->getMessage() . "\n\n";
    exit(1);
}

// Verify final results
echo "5️⃣ Verifying final plans...\n";
try {
    $allPlans = DB::table('plans')->get();
    echo "   📊 Total plans in database: " . count($allPlans) . "\n\n";
    
    echo "   📋 All plans:\n";
    foreach ($allPlans as $plan) {
        echo "      - ID {$plan->id}: {$plan->name} - \${$plan->price} ({$plan->duration_days} days)\n";
        echo "        Description: {$plan->description}\n";
        echo "        Features: " . $plan->features . "\n";
        echo "        Active: " . ($plan->is_active ? 'Yes' : 'No') . "\n";
        echo "\n";
    }
    
} catch (Exception $e) {
    echo "   ❌ Error verifying plans: " . $e->getMessage() . "\n";
}

echo "🔧 Plans price fix completed!\n";
echo "💡 The webhook system should now work properly with all required plans.\n";
