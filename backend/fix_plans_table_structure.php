<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

echo "🔧 Fixing Plans Table Structure and Data...\n";
echo "==========================================\n\n";

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

// Check current table structure
echo "2️⃣ Checking current plans table structure...\n";
try {
    $columns = DB::select("
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'plans' 
        ORDER BY ordinal_position
    ");
    
    echo "   📊 Current columns in plans table:\n";
    foreach ($columns as $column) {
        echo "      - {$column->column_name}: {$column->data_type} (nullable: {$column->is_nullable}, default: {$column->column_default})\n";
    }
    echo "\n";
    
} catch (Exception $e) {
    echo "   ❌ Error checking table structure: " . $e->getMessage() . "\n\n";
    exit(1);
}

// Drop and recreate the plans table with correct structure
echo "3️⃣ Recreating plans table with correct structure...\n";
try {
    // Drop existing table
    DB::statement("DROP TABLE IF EXISTS plans CASCADE");
    echo "   ✅ Dropped existing plans table\n";
    
    // Create table with correct structure based on original migration
    $sql = "CREATE TABLE plans (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        features JSONB NOT NULL,
        currency VARCHAR(10) DEFAULT 'MWK',
        price INTEGER DEFAULT 0,
        duration INTEGER DEFAULT 30,
        status INTEGER DEFAULT 1,
        text_sessions INTEGER DEFAULT 0,
        voice_calls INTEGER DEFAULT 0,
        video_calls INTEGER DEFAULT 0,
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL
    )";
    
    DB::statement($sql);
    echo "   ✅ Created plans table with correct structure\n\n";
    
} catch (Exception $e) {
    echo "   ❌ Error recreating table: " . $e->getMessage() . "\n\n";
    exit(1);
}

// Add the correct plans with proper structure
echo "4️⃣ Adding correct plans...\n";
try {
    $plansToAdd = [
        // USD Plans
        [
            'id' => 1,
            'name' => 'Basic Life',
            'features' => '{"consultations": 5, "text_sessions": 10, "voice_calls": 2, "video_calls": 1, "health_records": false, "priority_support": false}',
            'currency' => 'USD',
            'price' => 999, // $9.99 in cents
            'duration' => 30,
            'status' => 1,
            'text_sessions' => 10,
            'voice_calls' => 2,
            'video_calls' => 1
        ],
        [
            'id' => 2,
            'name' => 'Executive Life',
            'features' => '{"consultations": 15, "text_sessions": 30, "voice_calls": 5, "video_calls": 3, "health_records": true, "priority_support": false}',
            'currency' => 'USD',
            'price' => 1999, // $19.99 in cents
            'duration' => 30,
            'status' => 1,
            'text_sessions' => 30,
            'voice_calls' => 5,
            'video_calls' => 3
        ],
        [
            'id' => 3,
            'name' => 'Premium Life',
            'features' => '{"consultations": 30, "text_sessions": 60, "voice_calls": 10, "video_calls": 5, "health_records": true, "priority_support": true}',
            'currency' => 'USD',
            'price' => 3999, // $39.99 in cents
            'duration' => 30,
            'status' => 1,
            'text_sessions' => 60,
            'voice_calls' => 10,
            'video_calls' => 5
        ],
        
        // MWK Plans
        [
            'id' => 4,
            'name' => 'Basic Life',
            'features' => '{"consultations": 5, "text_sessions": 10, "voice_calls": 2, "video_calls": 1, "health_records": false, "priority_support": false}',
            'currency' => 'MWK',
            'price' => 15000,
            'duration' => 30,
            'status' => 1,
            'text_sessions' => 10,
            'voice_calls' => 2,
            'video_calls' => 1
        ],
        [
            'id' => 5,
            'name' => 'Executive Life',
            'features' => '{"consultations": 15, "text_sessions": 30, "voice_calls": 5, "video_calls": 3, "health_records": true, "priority_support": false}',
            'currency' => 'MWK',
            'price' => 30000,
            'duration' => 30,
            'status' => 1,
            'text_sessions' => 30,
            'voice_calls' => 5,
            'video_calls' => 3
        ],
        [
            'id' => 6,
            'name' => 'Premium Life',
            'features' => '{"consultations": 30, "text_sessions": 60, "voice_calls": 10, "video_calls": 5, "health_records": true, "priority_support": true}',
            'currency' => 'MWK',
            'price' => 60000,
            'duration' => 30,
            'status' => 1,
            'text_sessions' => 60,
            'voice_calls' => 10,
            'video_calls' => 5
        ]
    ];
    
    foreach ($plansToAdd as $plan) {
        $sql = "INSERT INTO plans (id, name, features, currency, price, duration, status, text_sessions, voice_calls, video_calls, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
        
        DB::insert($sql, [
            $plan['id'],
            $plan['name'],
            $plan['features'],
            $plan['currency'],
            $plan['price'],
            $plan['duration'],
            $plan['status'],
            $plan['text_sessions'],
            $plan['voice_calls'],
            $plan['video_calls']
        ]);
        
        $displayPrice = $plan['currency'] === 'USD' ? '$' . number_format($plan['price'] / 100, 2) : 'MWK ' . number_format($plan['price']);
        echo "   ✅ Added: {$plan['name']} (ID: {$plan['id']}, {$plan['currency']} {$displayPrice})\n";
    }
    
    echo "\n   📊 Successfully added " . count($plansToAdd) . " plans\n\n";
    
} catch (Exception $e) {
    echo "   ❌ Error adding plans: " . $e->getMessage() . "\n\n";
    exit(1);
}

// Verify the results
echo "5️⃣ Verifying plans were added...\n";
try {
    $finalPlans = DB::select("SELECT * FROM plans ORDER BY currency, id");
    echo "   📊 Total plans in database: " . count($finalPlans) . "\n\n";
    
    echo "   📋 All plans:\n";
    $currentCurrency = '';
    foreach ($finalPlans as $plan) {
        if ($plan->currency !== $currentCurrency) {
            echo "\n   💰 {$plan->currency} Plans:\n";
            $currentCurrency = $plan->currency;
        }
        
        $displayPrice = $plan->currency === 'USD' ? '$' . number_format($plan->price / 100, 2) : 'MWK ' . number_format($plan->price);
        echo "      - ID {$plan->id}: {$plan->name} - {$displayPrice} ({$plan->duration} days)\n";
        echo "        Text Sessions: {$plan->text_sessions}, Voice Calls: {$plan->voice_calls}, Video Calls: {$plan->video_calls}\n";
        echo "        Features: {$plan->features}\n";
        echo "        Status: " . ($plan->status ? 'Active' : 'Inactive') . "\n";
        echo "\n";
    }
    
} catch (Exception $e) {
    echo "   ❌ Error verifying plans: " . $e->getMessage() . "\n";
}

echo "🔧 Plans table structure and data fixed!\n";
echo "💡 The webhook system should now work properly with the correct plans structure.\n";
