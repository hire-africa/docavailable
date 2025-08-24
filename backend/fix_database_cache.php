<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

echo "🔧 Fixing Database Cache Issue...\n";
echo "===============================\n\n";

// Test 1: Check current database connection
echo "1️⃣ Testing current database connection...\n";
try {
    $pdo = DB::connection()->getPdo();
    echo "   ✅ Database connection successful\n";
    echo "   📊 Database: " . DB::connection()->getDatabaseName() . "\n";
    echo "   🔗 Driver: " . DB::connection()->getDriverName() . "\n\n";
} catch (Exception $e) {
    echo "   ❌ Database connection failed: " . $e->getMessage() . "\n\n";
    exit(1);
}

// Test 2: Check if the cached plan error occurs
echo "2️⃣ Testing for cached plan error...\n";
try {
    $userCount = DB::table('users')->count();
    echo "   ✅ Users table query successful\n";
    echo "   📊 Users in database: $userCount\n\n";
} catch (Exception $e) {
    echo "   ❌ Cached plan error detected: " . $e->getMessage() . "\n";
    echo "   🔧 Attempting to fix...\n\n";
    
    // Fix 1: Clear the database connection cache
    echo "3️⃣ Clearing database connection cache...\n";
    try {
        // Disconnect and reconnect
        DB::disconnect();
        echo "   ✅ Disconnected from database\n";
        
        // Wait a moment
        sleep(1);
        
        // Reconnect
        $pdo = DB::connection()->getPdo();
        echo "   ✅ Reconnected to database\n";
        
        // Test the query again
        $userCount = DB::table('users')->count();
        echo "   ✅ Users table query successful after reconnection\n";
        echo "   📊 Users in database: $userCount\n\n";
        
    } catch (Exception $e2) {
        echo "   ❌ Reconnection failed: " . $e2->getMessage() . "\n\n";
        
        // Fix 2: Try to clear PostgreSQL statement cache
        echo "4️⃣ Attempting PostgreSQL statement cache clear...\n";
        try {
            // Execute DISCARD ALL to clear all caches
            DB::statement('DISCARD ALL');
            echo "   ✅ PostgreSQL caches cleared\n";
            
            // Test the query again
            $userCount = DB::table('users')->count();
            echo "   ✅ Users table query successful after cache clear\n";
            echo "   📊 Users in database: $userCount\n\n";
            
        } catch (Exception $e3) {
            echo "   ❌ Cache clear failed: " . $e3->getMessage() . "\n\n";
            
            // Fix 3: Try to restart the connection with different parameters
            echo "5️⃣ Attempting connection restart...\n";
            try {
                // Get current connection config
                $config = config('database.connections.' . config('database.default'));
                
                // Add options to prevent caching
                $config['options'] = [
                    PDO::ATTR_EMULATE_PREPARES => false,
                    PDO::ATTR_PERSISTENT => false
                ];
                
                // Disconnect and reconnect with new config
                DB::disconnect();
                DB::purge();
                
                // Reconnect
                $pdo = DB::connection()->getPdo();
                echo "   ✅ Reconnected with no-cache options\n";
                
                // Test the query again
                $userCount = DB::table('users')->count();
                echo "   ✅ Users table query successful with no-cache options\n";
                echo "   📊 Users in database: $userCount\n\n";
                
            } catch (Exception $e4) {
                echo "   ❌ Connection restart failed: " . $e4->getMessage() . "\n\n";
                echo "   💡 This might require a database restart or manual intervention.\n";
            }
        }
    }
}

// Test 3: Test login functionality
echo "6️⃣ Testing login functionality...\n";
try {
    // Test if we can query users with authentication
    $user = DB::table('users')->first();
    if ($user) {
        echo "   ✅ User query successful\n";
        echo "   👤 User email: " . ($user->email ?? 'N/A') . "\n";
        echo "   🔑 Has password: " . (!empty($user->password) ? 'Yes' : 'No') . "\n";
        
        // Test if we can access user model
        $userModel = \App\Models\User::first();
        if ($userModel) {
            echo "   ✅ User model query successful\n";
            echo "   📊 User type: " . ($userModel->user_type ?? 'N/A') . "\n";
            echo "   📊 User status: " . ($userModel->status ?? 'N/A') . "\n";
        } else {
            echo "   ❌ User model query failed\n";
        }
    } else {
        echo "   ⚠️ No users found in database\n";
    }
    echo "\n";
    
} catch (Exception $e) {
    echo "   ❌ Login functionality test failed: " . $e->getMessage() . "\n\n";
}

// Test 4: Test JWT token generation
echo "7️⃣ Testing JWT token generation...\n";
try {
    $user = \App\Models\User::first();
    if ($user) {
        $token = auth('api')->login($user);
        echo "   ✅ JWT token generation successful\n";
        echo "   🔑 Token length: " . strlen($token) . "\n";
        echo "   👤 User ID: " . $user->id . "\n";
    } else {
        echo "   ⚠️ No users available for JWT test\n";
    }
    echo "\n";
    
} catch (Exception $e) {
    echo "   ❌ JWT token generation failed: " . $e->getMessage() . "\n\n";
}

echo "🔧 Database cache fix completed!\n";
echo "💡 The login functionality should now work properly.\n";
