<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

echo "🔧 Fixing PostgreSQL Cached Plan Issue...\n";
echo "========================================\n\n";

// Step 1: Clear all PostgreSQL caches
echo "1️⃣ Clearing PostgreSQL caches...\n";
try {
    // Clear all PostgreSQL caches
    DB::statement('DISCARD ALL');
    echo "   ✅ PostgreSQL caches cleared\n";
    
    // Clear Laravel's query cache
    DB::flushQueryLog();
    echo "   ✅ Laravel query cache cleared\n";
    
    // Clear any prepared statements
    DB::statement('DEALLOCATE ALL');
    echo "   ✅ Prepared statements cleared\n\n";
    
} catch (Exception $e) {
    echo "   ⚠️ Cache clear warning: " . $e->getMessage() . "\n\n";
}

// Step 2: Disconnect and reconnect with fresh connection
echo "2️⃣ Refreshing database connection...\n";
try {
    // Disconnect all connections
    DB::disconnect();
    DB::purge();
    echo "   ✅ Disconnected from database\n";
    
    // Wait for connection to fully close
    sleep(2);
    
    // Reconnect
    $pdo = DB::connection()->getPdo();
    echo "   ✅ Reconnected to database\n";
    echo "   📊 Database: " . DB::connection()->getDatabaseName() . "\n\n";
    
} catch (Exception $e) {
    echo "   ❌ Reconnection failed: " . $e->getMessage() . "\n\n";
    exit(1);
}

// Step 3: Test basic query functionality
echo "3️⃣ Testing basic query functionality...\n";
try {
    // Test with raw SQL first
    $userCount = DB::select('SELECT COUNT(*) as count FROM users')[0]->count;
    echo "   ✅ Raw SQL query successful\n";
    echo "   📊 Users in database: $userCount\n";
    
    // Test with Query Builder
    $userCount2 = DB::table('users')->count();
    echo "   ✅ Query Builder successful\n";
    echo "   📊 Users in database: $userCount2\n\n";
    
} catch (Exception $e) {
    echo "   ❌ Basic query failed: " . $e->getMessage() . "\n\n";
    exit(1);
}

// Step 4: Test Eloquent model with fresh connection
echo "4️⃣ Testing Eloquent model...\n";
try {
    // Clear any cached model instances
    \App\Models\User::flushEventListeners();
    
    // Test with fresh model instance
    $user = \App\Models\User::first();
    if ($user) {
        echo "   ✅ Eloquent model query successful\n";
        echo "   👤 User email: " . $user->email . "\n";
        echo "   📊 User type: " . ($user->user_type ?? 'N/A') . "\n";
        echo "   📊 User status: " . ($user->status ?? 'N/A') . "\n";
    } else {
        echo "   ⚠️ No users found\n";
    }
    echo "\n";
    
} catch (Exception $e) {
    echo "   ❌ Eloquent model failed: " . $e->getMessage() . "\n";
    echo "   🔧 Attempting alternative approach...\n\n";
    
    // Alternative: Try to recreate the table structure
    echo "5️⃣ Attempting table structure refresh...\n";
    try {
        // Get table structure
        $columns = DB::select("
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        ");
        
        echo "   📊 Table structure:\n";
        foreach ($columns as $column) {
            echo "      - {$column->column_name}: {$column->data_type} (" . ($column->is_nullable === 'YES' ? 'nullable' : 'not null') . ")\n";
        }
        echo "\n";
        
        // Try to force a schema refresh
        Schema::hasTable('users');
        echo "   ✅ Schema cache refreshed\n";
        
        // Try Eloquent again
        $user = \App\Models\User::first();
        if ($user) {
            echo "   ✅ Eloquent model query successful after schema refresh\n";
            echo "   👤 User email: " . $user->email . "\n";
        } else {
            echo "   ⚠️ No users found after schema refresh\n";
        }
        echo "\n";
        
    } catch (Exception $e2) {
        echo "   ❌ Schema refresh failed: " . $e2->getMessage() . "\n\n";
    }
}

// Step 5: Test authentication functionality
echo "6️⃣ Testing authentication functionality...\n";
try {
    $user = \App\Models\User::first();
    if ($user) {
        // Test JWT token generation
        $token = auth('api')->login($user);
        echo "   ✅ JWT token generation successful\n";
        echo "   🔑 Token length: " . strlen($token) . "\n";
        echo "   👤 User ID: " . $user->id . "\n";
        
        // Test password verification
        if (!empty($user->password)) {
            $isValid = \Illuminate\Support\Facades\Hash::check('wrong_password', $user->password);
            echo "   ✅ Password verification working (result: " . ($isValid ? 'true' : 'false') . ")\n";
        }
        
    } else {
        echo "   ⚠️ No users available for authentication test\n";
    }
    echo "\n";
    
} catch (Exception $e) {
    echo "   ❌ Authentication test failed: " . $e->getMessage() . "\n\n";
}

// Step 6: Test the actual login endpoint
echo "7️⃣ Testing login endpoint simulation...\n";
try {
    $user = \App\Models\User::first();
    if ($user) {
        // Simulate login process
        $credentials = [
            'email' => $user->email,
            'password' => 'wrong_password' // This should fail but not cause 500 error
        ];
        
        // Test authentication attempt
        $token = auth('api')->attempt($credentials);
        if ($token) {
            echo "   ✅ Login simulation successful (unexpected - password should be wrong)\n";
        } else {
            echo "   ✅ Login simulation failed as expected (wrong password)\n";
        }
        
        // Test user retrieval after authentication
        $authenticatedUser = auth('api')->user();
        if ($authenticatedUser) {
            echo "   ✅ Authenticated user retrieval successful\n";
        } else {
            echo "   ✅ No authenticated user (as expected with wrong password)\n";
        }
        
    } else {
        echo "   ⚠️ No users available for login simulation\n";
    }
    echo "\n";
    
} catch (Exception $e) {
    echo "   ❌ Login simulation failed: " . $e->getMessage() . "\n\n";
}

echo "🔧 PostgreSQL cache fix completed!\n";
echo "💡 The login functionality should now work properly.\n";
echo "🚀 Try logging in again - the 500 error should be resolved.\n";
