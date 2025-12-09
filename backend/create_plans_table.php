<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

echo "📋 Creating Plans Table and Data...\n";
echo "==================================\n\n";

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

// Create plans table
echo "2️⃣ Creating plans table...\n";
try {
    $sql = "CREATE TABLE IF NOT EXISTS plans (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        duration_days INTEGER NOT NULL,
        features JSON,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )";
    
    DB::statement($sql);
    echo "   ✅ Plans table created/verified\n\n";
} catch (Exception $e) {
    echo "   ❌ Failed to create plans table: " . $e->getMessage() . "\n\n";
    exit(1);
}

// Check if plans already exist
echo "3️⃣ Checking existing plans...\n";
try {
    $existingPlans = DB::table('plans')->count();
    echo "   📊 Existing plans: $existingPlans\n\n";
    
    if ($existingPlans > 0) {
        echo "   ⏭️ Plans already exist, skipping creation\n\n";
    } else {
        echo "   🔄 Creating default plans...\n";
        
        // Define the exact plans needed for webhook functionality
        $plans = [
            [
                'name' => 'Basic Plan',
                'description' => 'Basic consultation plan with limited features',
                'price' => 9.99,
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
            ],
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
        
        $insertedPlans = 0;
        foreach ($plans as $plan) {
            try {
                DB::table('plans')->insert($plan);
                echo "   ✅ Created plan: " . $plan['name'] . "\n";
                $insertedPlans++;
            } catch (Exception $e) {
                echo "   ❌ Failed to create plan " . $plan['name'] . ": " . $e->getMessage() . "\n";
            }
        }
        
        echo "\n   📊 Successfully created $insertedPlans plans\n\n";
    }
    
} catch (Exception $e) {
    echo "   ❌ Error checking/creating plans: " . $e->getMessage() . "\n\n";
    exit(1);
}

// Create subscriptions table if it doesn't exist
echo "4️⃣ Creating subscriptions table...\n";
try {
    $sql = "CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        plan_id BIGINT NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_date TIMESTAMP,
        payment_transaction_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
    )";
    
    DB::statement($sql);
    echo "   ✅ Subscriptions table created/verified\n\n";
} catch (Exception $e) {
    echo "   ❌ Failed to create subscriptions table: " . $e->getMessage() . "\n\n";
}

// Create appointments table if it doesn't exist
echo "5️⃣ Creating appointments table...\n";
try {
    $sql = "CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        patient_id BIGINT NOT NULL,
        doctor_id BIGINT NOT NULL,
        appointment_type VARCHAR(50) DEFAULT 'consultation',
        status VARCHAR(20) DEFAULT 'pending',
        scheduled_at TIMESTAMP,
        duration_minutes INTEGER DEFAULT 30,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE
    )";
    
    DB::statement($sql);
    echo "   ✅ Appointments table created/verified\n\n";
} catch (Exception $e) {
    echo "   ❌ Failed to create appointments table: " . $e->getMessage() . "\n\n";
}

// Create text_sessions table if it doesn't exist
echo "6️⃣ Creating text_sessions table...\n";
try {
    $sql = "CREATE TABLE IF NOT EXISTS text_sessions (
        id SERIAL PRIMARY KEY,
        patient_id BIGINT NOT NULL,
        doctor_id BIGINT NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_time TIMESTAMP,
        total_messages INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE
    )";
    
    DB::statement($sql);
    echo "   ✅ Text sessions table created/verified\n\n";
} catch (Exception $e) {
    echo "   ❌ Failed to create text_sessions table: " . $e->getMessage() . "\n\n";
}

// Verify the results
echo "7️⃣ Verifying table creation...\n";
try {
    $keyTables = ['plans', 'subscriptions', 'appointments', 'text_sessions'];
    foreach ($keyTables as $table) {
        if (Schema::hasTable($table)) {
            $count = DB::table($table)->count();
            echo "   ✅ Table exists: $table ($count records)\n";
        } else {
            echo "   ❌ Table missing: $table\n";
        }
    }
    
    // Show plans details
    echo "\n   📋 Plans in database:\n";
    $plans = DB::table('plans')->get();
    foreach ($plans as $plan) {
        echo "      - {$plan->name}: \${$plan->price} ({$plan->duration_days} days)\n";
    }
    
} catch (Exception $e) {
    echo "   ❌ Verification failed: " . $e->getMessage() . "\n";
}

echo "\n📋 Plans table creation completed!\n";
echo "💡 The webhook system should now work properly with the plans data.\n";
