<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

echo "🔧 Adding Missing Columns...\n";
echo "===========================\n\n";

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

// Define all the columns to add
$columnsToAdd = [
    'user_type' => "ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type VARCHAR(20) DEFAULT 'patient'",
    'bio' => "ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT",
    'display_name' => "ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(255)",
    'date_of_birth' => "ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE",
    'gender' => "ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(10)",
    'country' => "ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(255)",
    'city' => "ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(255)",
    'years_of_experience' => "ALTER TABLE users ADD COLUMN IF NOT EXISTS years_of_experience INTEGER",
    'profile_picture' => "ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture VARCHAR(255)",
    'specialization' => "ALTER TABLE users ADD COLUMN IF NOT EXISTS specialization VARCHAR(255)",
    'specializations' => "ALTER TABLE users ADD COLUMN IF NOT EXISTS specializations JSON",
    'national_id' => "ALTER TABLE users ADD COLUMN IF NOT EXISTS national_id VARCHAR(255)",
    'medical_degree' => "ALTER TABLE users ADD COLUMN IF NOT EXISTS medical_degree VARCHAR(255)",
    'medical_licence' => "ALTER TABLE users ADD COLUMN IF NOT EXISTS medical_licence VARCHAR(255)",
    'sub_specialization' => "ALTER TABLE users ADD COLUMN IF NOT EXISTS sub_specialization VARCHAR(255)",
    'google_id' => "ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255)",
    'is_online_for_instant_sessions' => "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online_for_instant_sessions BOOLEAN DEFAULT false",
    'last_online_at' => "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_online_at TIMESTAMP",
    'public_key' => "ALTER TABLE users ADD COLUMN IF NOT EXISTS public_key TEXT",
    'private_key' => "ALTER TABLE users ADD COLUMN IF NOT EXISTS private_key TEXT",
    'encryption_enabled' => "ALTER TABLE users ADD COLUMN IF NOT EXISTS encryption_enabled BOOLEAN DEFAULT false",
    'notification_preferences' => "ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSON",
    'email_notifications_enabled' => "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT true",
    'push_notifications_enabled' => "ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT true",
    'sms_notifications_enabled' => "ALTER TABLE users ADD COLUMN IF NOT EXISTS sms_notifications_enabled BOOLEAN DEFAULT true",
    'privacy_preferences' => "ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_preferences JSON",
    'languages_spoken' => "ALTER TABLE users ADD COLUMN IF NOT EXISTS languages_spoken JSON",
    'rating' => "ALTER TABLE users ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0.00",
    'total_ratings' => "ALTER TABLE users ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0",
    'firebase_uid' => "ALTER TABLE users ADD COLUMN IF NOT EXISTS firebase_uid VARCHAR(255)",
    'occupation' => "ALTER TABLE users ADD COLUMN IF NOT EXISTS occupation VARCHAR(255)",
    'health_history' => "ALTER TABLE users ADD COLUMN IF NOT EXISTS health_history TEXT",
    'sub_specializations' => "ALTER TABLE users ADD COLUMN IF NOT EXISTS sub_specializations JSON",
    'status' => "ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'"
];

echo "2️⃣ Adding missing columns one by one...\n";
$addedColumns = 0;
$skippedColumns = 0;
$failedColumns = 0;

foreach ($columnsToAdd as $columnName => $sql) {
    echo "   🔄 Adding column: $columnName\n";
    
    try {
        // Check if column already exists
        $columnExists = DB::select("
            SELECT COUNT(*) as count 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = ?
        ", [$columnName]);
        
        if ($columnExists[0]->count > 0) {
            echo "   ⏭️ Column '$columnName' already exists, skipping...\n";
            $skippedColumns++;
            continue;
        }
        
        // Add the column
        DB::statement($sql);
        echo "   ✅ Added column '$columnName'\n";
        $addedColumns++;
        
    } catch (Exception $e) {
        echo "   ❌ Failed to add column '$columnName': " . $e->getMessage() . "\n";
        $failedColumns++;
    }
}

echo "\n📊 Column Addition Summary:\n";
echo "   ✅ Added: $addedColumns columns\n";
echo "   ⏭️ Skipped: $skippedColumns columns\n";
echo "   ❌ Failed: $failedColumns columns\n\n";

// Update existing users with display_name
echo "3️⃣ Updating existing users with display_name...\n";
try {
    $updatedUsers = DB::update("
        UPDATE users 
        SET display_name = CONCAT(first_name, ' ', last_name) 
        WHERE display_name IS NULL OR display_name = ''
    ");
    echo "   ✅ Updated $updatedUsers users with display_name\n\n";
} catch (Exception $e) {
    echo "   ❌ Failed to update display_name: " . $e->getMessage() . "\n\n";
}

// Verify the results
echo "4️⃣ Verifying column addition...\n";
try {
    // Check if key columns exist in users table
    $keyColumns = ['display_name', 'user_type', 'email', 'password', 'status'];
    foreach ($keyColumns as $column) {
        if (Schema::hasColumn('users', $column)) {
            echo "   ✅ Column exists: users.$column\n";
        } else {
            echo "   ❌ Column missing: users.$column\n";
        }
    }
    
    // Check total columns in users table
    $totalColumns = DB::select("
        SELECT COUNT(*) as count 
        FROM information_schema.columns 
        WHERE table_name = 'users'
    ");
    echo "   📊 Total columns in users table: " . $totalColumns[0]->count . "\n";
    
} catch (Exception $e) {
    echo "   ❌ Verification failed: " . $e->getMessage() . "\n";
}

echo "\n🔧 Column addition completed!\n";
echo "💡 The users table should now have all required columns.\n";
