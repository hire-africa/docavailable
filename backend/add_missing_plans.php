<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

echo "📋 Adding Missing Plans...\n";
echo "=========================\n\n";

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

// Add missing columns to plans table if needed
echo "2️⃣ Checking plans table structure...\n";
try {
    $columns = DB::select("
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'plans' 
        ORDER BY ordinal_position
    ");
    
    echo "   📊 Current columns in plans table:\n";
    foreach ($columns as $column) {
        echo "      - {$column->column_name}: {$column->data_type}\n";
    }
    echo "\n";
    
    // Add missing columns if needed
    $requiredColumns = [
        'description' => "ALTER TABLE plans ADD COLUMN IF NOT EXISTS description TEXT",
        'currency' => "ALTER TABLE plans ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD'",
        'duration_days' => "ALTER TABLE plans ADD COLUMN IF NOT EXISTS duration_days INTEGER DEFAULT 30",
        'features' => "ALTER TABLE plans ADD COLUMN IF NOT EXISTS features JSON",
        'is_active' => "ALTER TABLE plans ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true"
    ];
    
    foreach ($requiredColumns as $columnName => $sql) {
        $columnExists = DB::select("
            SELECT COUNT(*) as count 
            FROM information_schema.columns 
            WHERE table_name = 'plans' AND column_name = ?
        ", [$columnName]);
        
        if ($columnExists[0]->count == 0) {
            DB::statement($sql);
            echo "   ✅ Added missing column: $columnName\n";
        } else {
            echo "   ⏭️ Column already exists: $columnName\n";
        }
    }
    echo "\n";
    
} catch (Exception $e) {
    echo "   ❌ Error checking table structure: " . $e->getMessage() . "\n\n";
    exit(1);
}

// Check existing plans
echo "3️⃣ Checking existing plans...\n";
try {
    $existingPlans = DB::table('plans')->get();
    echo "   📊 Found " . count($existingPlans) . " existing plans:\n";
    
    foreach ($existingPlans as $plan) {
        echo "      - ID {$plan->id}: {$plan->name} (\${$plan->price})\n";
    }
    echo "\n";
    
} catch (Exception $e) {
    echo "   ❌ Error checking existing plans: " . $e->getMessage() . "\n\n";
    exit(1);
}

// Add missing plans
echo "4️⃣ Adding missing plans...\n";
try {
    // Define the exact plans needed for webhook functionality
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

// Update existing Basic Plan if needed
echo "5️⃣ Updating existing Basic Plan...\n";
try {
    $basicPlan = DB::table('plans')->where('name', 'Basic Plan')->first();
    
    if ($basicPlan) {
        // Update the Basic Plan with complete data
        DB::table('plans')->where('id', $basicPlan->id)->update([
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
        echo "   ✅ Updated Basic Plan with complete data\n";
    } else {
        echo "   ⚠️ Basic Plan not found\n";
    }
    echo "\n";
    
} catch (Exception $e) {
    echo "   ❌ Error updating Basic Plan: " . $e->getMessage() . "\n\n";
}

// Verify final results
echo "6️⃣ Verifying final plans...\n";
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

echo "📋 Plans setup completed!\n";
echo "💡 The webhook system should now work properly with all required plans.\n";
