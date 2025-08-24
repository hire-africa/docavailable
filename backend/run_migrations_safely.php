<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

echo "🚀 Running Migrations Safely...\n";
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

// Ensure migrations table exists
echo "2️⃣ Ensuring migrations table exists...\n";
try {
    $sql = "CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        migration VARCHAR(255) NOT NULL,
        batch INTEGER NOT NULL
    )";
    
    DB::statement($sql);
    echo "   ✅ Migrations table ready\n\n";
} catch (Exception $e) {
    echo "   ❌ Failed to create migrations table: " . $e->getMessage() . "\n\n";
    exit(1);
}

// Run the most critical migrations first using raw SQL
echo "3️⃣ Running critical migrations with raw SQL...\n";

$criticalMigrations = [
    'create_users_table' => "
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            first_name VARCHAR(255) NOT NULL,
            last_name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            email_verified_at TIMESTAMP NULL,
            password VARCHAR(255) NOT NULL,
            remember_token VARCHAR(100) NULL,
            push_token VARCHAR(255) NULL,
            is_active BOOLEAN NULL,
            created_at TIMESTAMP NULL,
            updated_at TIMESTAMP NULL
        )
    ",
    
    'create_password_reset_tokens_table' => "
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            email VARCHAR(255) PRIMARY KEY,
            token VARCHAR(255) NOT NULL,
            created_at TIMESTAMP NULL
        )
    ",
    
    'create_sessions_table' => "
        CREATE TABLE IF NOT EXISTS sessions (
            id VARCHAR(255) PRIMARY KEY,
            user_id BIGINT NULL,
            ip_address VARCHAR(45) NULL,
            user_agent TEXT NULL,
            payload TEXT NOT NULL,
            last_activity INTEGER NOT NULL
        )
    ",
    
    'add_missing_user_columns' => "
        ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type VARCHAR(20) DEFAULT 'patient';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(10);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS years_of_experience INTEGER;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS specialization VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS specializations JSON;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS national_id VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS medical_degree VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS medical_licence VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS sub_specialization VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online_for_instant_sessions BOOLEAN DEFAULT false;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS last_online_at TIMESTAMP;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS public_key TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS private_key TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS encryption_enabled BOOLEAN DEFAULT false;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSON;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT true;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT true;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS sms_notifications_enabled BOOLEAN DEFAULT true;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_preferences JSON;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS languages_spoken JSON;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0.00;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS firebase_uid VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS occupation VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS health_history TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS sub_specializations JSON;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
    "
];

$successCount = 0;
$errorCount = 0;

foreach ($criticalMigrations as $migrationName => $sql) {
    echo "   🔄 Running: $migrationName\n";
    
    try {
        // Check if migration already recorded
        $exists = DB::table('migrations')->where('migration', $migrationName)->exists();
        
        if (!$exists) {
            // Execute the SQL
            DB::statement($sql);
            
            // Record the migration
            $batch = DB::table('migrations')->max('batch') + 1;
            DB::table('migrations')->insert([
                'migration' => $migrationName,
                'batch' => $batch
            ]);
            
            echo "   ✅ Success: $migrationName\n";
            $successCount++;
        } else {
            echo "   ⏭️ Skipped: $migrationName (already run)\n";
        }
        
    } catch (Exception $e) {
        echo "   ❌ Failed: $migrationName - " . $e->getMessage() . "\n";
        $errorCount++;
    }
}

echo "\n📊 Critical Migration Summary:\n";
echo "   ✅ Successful: $successCount\n";
echo "   ❌ Failed: $errorCount\n\n";

// Update existing users with display_name
echo "4️⃣ Updating existing users...\n";
try {
    $updatedUsers = DB::update("
        UPDATE users 
        SET display_name = CONCAT(first_name, ' ', last_name) 
        WHERE display_name IS NULL OR display_name = ''
    ");
    echo "   ✅ Updated $updatedUsers users with display_name\n\n";
} catch (Exception $e) {
    echo "   ❌ Failed to update users: " . $e->getMessage() . "\n\n";
}

// Verify the results
echo "5️⃣ Verifying migration results...\n";
try {
    $migrationCount = DB::table('migrations')->count();
    echo "   📊 Total migrations recorded: $migrationCount\n";
    
    // Check if key tables exist
    $keyTables = ['users', 'password_reset_tokens', 'sessions'];
    foreach ($keyTables as $table) {
        if (Schema::hasTable($table)) {
            echo "   ✅ Table exists: $table\n";
        } else {
            echo "   ❌ Table missing: $table\n";
        }
    }
    
    // Check if key columns exist in users table
    $keyColumns = ['display_name', 'user_type', 'email', 'password'];
    foreach ($keyColumns as $column) {
        if (Schema::hasColumn('users', $column)) {
            echo "   ✅ Column exists: users.$column\n";
        } else {
            echo "   ❌ Column missing: users.$column\n";
        }
    }
    
} catch (Exception $e) {
    echo "   ❌ Verification failed: " . $e->getMessage() . "\n";
}

echo "\n🚀 Safe migration completed!\n";
echo "💡 The database should now have all required tables and columns for basic functionality.\n";
