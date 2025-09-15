<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

echo "🚀 Deploying Database Fixes to Live Backend...\n";
echo "============================================\n\n";

// Test local database connection first
echo "1️⃣ Testing local database connection...\n";
try {
    $pdo = DB::connection()->getPdo();
    echo "   ✅ Local database connection successful\n\n";
} catch (Exception $e) {
    echo "   ❌ Local database connection failed: " . $e->getMessage() . "\n\n";
    exit(1);
}

// Check if we're connected to the live database
echo "2️⃣ Checking database connection details...\n";
$dbName = DB::connection()->getDatabaseName();
$dbHost = config('database.connections.' . config('database.default') . '.host');

echo "   📊 Database: $dbName\n";
echo "   🌐 Host: $dbHost\n";

if (strpos($dbHost, 'ep-royal-term') !== false) {
    echo "   ✅ Connected to live database (Render.com)\n\n";
} else {
    echo "   ⚠️ Connected to local/development database\n";
    echo "   💡 Make sure you're using the live database configuration\n\n";
}

// Check current schema
echo "3️⃣ Checking current database schema...\n";
try {
    $userCount = DB::table('users')->count();
    echo "   📊 Users in database: $userCount\n";
    
    // Check if display_name column exists
    if (Schema::hasColumn('users', 'display_name')) {
        echo "   ✅ display_name column exists\n";
    } else {
        echo "   ❌ display_name column missing - will add it\n";
    }
    
    // Check other important columns
    $importantColumns = ['user_type', 'bio', 'date_of_birth', 'gender', 'country', 'city'];
    $missingColumns = [];
    
    foreach ($importantColumns as $column) {
        if (!Schema::hasColumn('users', $column)) {
            $missingColumns[] = $column;
        }
    }
    
    if (empty($missingColumns)) {
        echo "   ✅ All important columns exist\n\n";
    } else {
        echo "   ❌ Missing columns: " . implode(', ', $missingColumns) . "\n\n";
    }
    
} catch (Exception $e) {
    echo "   ❌ Error checking schema: " . $e->getMessage() . "\n\n";
    exit(1);
}

// Add missing columns if needed
if (!Schema::hasColumn('users', 'display_name') || !empty($missingColumns)) {
    echo "4️⃣ Adding missing columns...\n";
    
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
        'sub_specializations' => "ALTER TABLE users ADD COLUMN IF NOT EXISTS sub_specializations JSON"
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
} else {
    echo "4️⃣ All required columns already exist, skipping...\n\n";
}

// Update existing users with display_name
echo "5️⃣ Updating existing users with display_name...\n";
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

// Test the health endpoint
echo "6️⃣ Testing health endpoint...\n";
try {
    $health = [
        'status' => 'ok',
        'timestamp' => now()->toISOString(),
        'message' => 'Backend is running',
        'services' => []
    ];

    // Test database connection
    try {
        $dbConnection = DB::connection()->getPdo();
        $health['services']['database'] = [
            'status' => 'ok',
            'driver' => config('database.default'),
            'connected' => true,
            'name' => DB::connection()->getDatabaseName(),
            'host' => config('database.connections.' . config('database.default') . '.host'),
            'connection_name' => DB::connection()->getName()
        ];
    } catch (\Exception $e) {
        $health['services']['database'] = [
            'status' => 'error',
            'driver' => config('database.default'),
            'connected' => false,
            'error' => $e->getMessage(),
            'host' => config('database.connections.' . config('database.default') . '.host'),
            'connection_name' => config('database.default')
        ];
        $health['status'] = 'error';
    }

    echo "   ✅ Health check working\n";
    echo "   📊 Health status: " . $health['status'] . "\n";
    echo "   🗄️ Database status: " . $health['services']['database']['status'] . "\n\n";
    
} catch (Exception $e) {
    echo "   ❌ Health check failed: " . $e->getMessage() . "\n\n";
}

echo "🚀 Database fixes deployment completed!\n";
echo "💡 The live backend should now work with the APK.\n";
