<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

echo "🔧 Fixing Database Schema...\n";
echo "==========================\n\n";

// Test database connection
echo "1️⃣ Testing database connection...\n";
try {
    $pdo = DB::connection()->getPdo();
    echo "   ✅ Database connection successful\n\n";
} catch (Exception $e) {
    echo "   ❌ Database connection failed: " . $e->getMessage() . "\n\n";
    exit(1);
}

// Add missing columns to users table
echo "2️⃣ Adding missing columns to users table...\n";

$columnsToAdd = [
    'user_type' => "ALTER TABLE users ADD COLUMN user_type VARCHAR(20) DEFAULT 'patient'",
    'bio' => "ALTER TABLE users ADD COLUMN bio TEXT",
    'display_name' => "ALTER TABLE users ADD COLUMN display_name VARCHAR(255)",
    'date_of_birth' => "ALTER TABLE users ADD COLUMN date_of_birth DATE",
    'gender' => "ALTER TABLE users ADD COLUMN gender VARCHAR(10)",
    'country' => "ALTER TABLE users ADD COLUMN country VARCHAR(255)",
    'city' => "ALTER TABLE users ADD COLUMN city VARCHAR(255)",
    'years_of_experience' => "ALTER TABLE users ADD COLUMN years_of_experience INTEGER",
    'profile_picture' => "ALTER TABLE users ADD COLUMN profile_picture VARCHAR(255)",
    'specialization' => "ALTER TABLE users ADD COLUMN specialization VARCHAR(255)",
    'specializations' => "ALTER TABLE users ADD COLUMN specializations JSON",
    'national_id' => "ALTER TABLE users ADD COLUMN national_id VARCHAR(255)",
    'medical_degree' => "ALTER TABLE users ADD COLUMN medical_degree VARCHAR(255)",
    'medical_licence' => "ALTER TABLE users ADD COLUMN medical_licence VARCHAR(255)",
    'sub_specialization' => "ALTER TABLE users ADD COLUMN sub_specialization VARCHAR(255)",
    'google_id' => "ALTER TABLE users ADD COLUMN google_id VARCHAR(255)",
    'is_online_for_instant_sessions' => "ALTER TABLE users ADD COLUMN is_online_for_instant_sessions BOOLEAN DEFAULT false",
    'last_online_at' => "ALTER TABLE users ADD COLUMN last_online_at TIMESTAMP",
    'public_key' => "ALTER TABLE users ADD COLUMN public_key TEXT",
    'private_key' => "ALTER TABLE users ADD COLUMN private_key TEXT",
    'encryption_enabled' => "ALTER TABLE users ADD COLUMN encryption_enabled BOOLEAN DEFAULT false",
    'notification_preferences' => "ALTER TABLE users ADD COLUMN notification_preferences JSON",
    'email_notifications_enabled' => "ALTER TABLE users ADD COLUMN email_notifications_enabled BOOLEAN DEFAULT true",
    'push_notifications_enabled' => "ALTER TABLE users ADD COLUMN push_notifications_enabled BOOLEAN DEFAULT true",
    'sms_notifications_enabled' => "ALTER TABLE users ADD COLUMN sms_notifications_enabled BOOLEAN DEFAULT true",
    'privacy_preferences' => "ALTER TABLE users ADD COLUMN privacy_preferences JSON",
    'languages_spoken' => "ALTER TABLE users ADD COLUMN languages_spoken JSON",
    'rating' => "ALTER TABLE users ADD COLUMN rating DECIMAL(3,2) DEFAULT 0.00",
    'total_ratings' => "ALTER TABLE users ADD COLUMN total_ratings INTEGER DEFAULT 0",
    'firebase_uid' => "ALTER TABLE users ADD COLUMN firebase_uid VARCHAR(255)",
    'occupation' => "ALTER TABLE users ADD COLUMN occupation VARCHAR(255)",
    'health_history' => "ALTER TABLE users ADD COLUMN health_history TEXT",
    'sub_specializations' => "ALTER TABLE users ADD COLUMN sub_specializations JSON"
];

$addedColumns = 0;
$skippedColumns = 0;

foreach ($columnsToAdd as $columnName => $sql) {
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
    }
}

echo "\n📊 Summary:\n";
echo "   - Added: $addedColumns columns\n";
echo "   - Skipped: $skippedColumns columns\n\n";

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

// Verify the fix
echo "4️⃣ Verifying the fix...\n";
try {
    if (Schema::hasColumn('users', 'display_name')) {
        echo "   ✅ display_name column now exists\n";
        
        $userCount = DB::table('users')->count();
        echo "   📊 Total users in database: $userCount\n";
        
        if ($userCount > 0) {
            $sampleUser = DB::table('users')->select('id', 'first_name', 'last_name', 'display_name')->first();
            echo "   👤 Sample user: ID {$sampleUser->id}, Name: {$sampleUser->display_name}\n";
        }
    } else {
        echo "   ❌ display_name column still missing\n";
    }
} catch (Exception $e) {
    echo "   ❌ Error verifying fix: " . $e->getMessage() . "\n";
}

echo "\n🔧 Database schema fix completed!\n";
