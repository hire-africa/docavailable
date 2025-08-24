<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use App\Models\User;

echo "🔍 Testing Login Debug...\n";
echo "========================\n\n";

// Test 1: Database connection
echo "1️⃣ Testing database connection...\n";
try {
    $pdo = DB::connection()->getPdo();
    echo "   ✅ Database connection successful\n";
    echo "   📊 Database: " . DB::connection()->getDatabaseName() . "\n\n";
} catch (Exception $e) {
    echo "   ❌ Database connection failed: " . $e->getMessage() . "\n\n";
    exit(1);
}

// Test 2: Check if users table exists and has data
echo "2️⃣ Testing users table...\n";
try {
    $userCount = DB::table('users')->count();
    echo "   📊 Users in database: $userCount\n";
    
    if ($userCount > 0) {
        $firstUser = DB::table('users')->first();
        echo "   👤 First user email: " . ($firstUser->email ?? 'N/A') . "\n";
        echo "   🔑 Has password: " . (!empty($firstUser->password) ? 'Yes' : 'No') . "\n";
    } else {
        echo "   ⚠️ No users found in database\n";
    }
    echo "\n";
} catch (Exception $e) {
    echo "   ❌ Users table error: " . $e->getMessage() . "\n\n";
    exit(1);
}

// Test 3: Test JWT configuration
echo "3️⃣ Testing JWT configuration...\n";
try {
    $jwtSecret = config('jwt.secret');
    if (!empty($jwtSecret)) {
        echo "   ✅ JWT secret is configured\n";
    } else {
        echo "   ❌ JWT secret is not configured\n";
    }
    
    $jwtTtl = config('jwt.ttl');
    echo "   ⏰ JWT TTL: " . ($jwtTtl ?? 'Not set') . "\n\n";
} catch (Exception $e) {
    echo "   ❌ JWT configuration error: " . $e->getMessage() . "\n\n";
}

// Test 4: Test authentication guard
echo "4️⃣ Testing authentication guard...\n";
try {
    $guard = Auth::guard('api');
    echo "   ✅ API guard is available\n";
    
    // Test if we can create a token for the first user
    if ($userCount > 0) {
        $firstUser = User::first();
        if ($firstUser) {
            try {
                $token = $guard->login($firstUser);
                echo "   ✅ Token generation successful\n";
                echo "   🔑 Token length: " . strlen($token) . "\n";
                echo "   👤 User ID: " . $firstUser->id . "\n";
            } catch (Exception $e) {
                echo "   ❌ Token generation failed: " . $e->getMessage() . "\n";
            }
        }
    }
    echo "\n";
} catch (Exception $e) {
    echo "   ❌ Authentication guard error: " . $e->getMessage() . "\n\n";
}

// Test 5: Test user model
echo "5️⃣ Testing user model...\n";
try {
    if ($userCount > 0) {
        $user = User::first();
        echo "   ✅ User model is working\n";
        echo "   📧 User email: " . $user->email . "\n";
        echo "   👤 User type: " . ($user->user_type ?? 'N/A') . "\n";
        echo "   📊 User status: " . ($user->status ?? 'N/A') . "\n";
        
        // Test if user has required columns
        $requiredColumns = ['display_name', 'user_type', 'email', 'password'];
        $missingColumns = [];
        
        foreach ($requiredColumns as $column) {
            if (!isset($user->$column)) {
                $missingColumns[] = $column;
            }
        }
        
        if (empty($missingColumns)) {
            echo "   ✅ All required columns exist\n";
        } else {
            echo "   ❌ Missing columns: " . implode(', ', $missingColumns) . "\n";
        }
    }
    echo "\n";
} catch (Exception $e) {
    echo "   ❌ User model error: " . $e->getMessage() . "\n\n";
}

// Test 6: Test image URL generation
echo "6️⃣ Testing image URL generation...\n";
try {
    if ($userCount > 0) {
        $user = User::first();
        
        // Test the generateImageUrls method
        $controller = new \App\Http\Controllers\Auth\AuthenticationController();
        $userData = $controller->generateImageUrls($user);
        
        echo "   ✅ Image URL generation successful\n";
        echo "   📊 User data keys: " . implode(', ', array_keys($userData)) . "\n";
        
        if (isset($userData['profile_picture_url'])) {
            echo "   🖼️ Profile picture URL: " . ($userData['profile_picture_url'] ?? 'N/A') . "\n";
        }
    }
    echo "\n";
} catch (Exception $e) {
    echo "   ❌ Image URL generation error: " . $e->getMessage() . "\n\n";
}

// Test 7: Simulate login attempt
echo "7️⃣ Simulating login attempt...\n";
try {
    if ($userCount > 0) {
        $user = User::first();
        
        // Test password verification
        if (!empty($user->password)) {
            echo "   🔑 User has password hash\n";
            
            // Test with a dummy password (this will fail but shouldn't cause 500 error)
            $isValid = Hash::check('wrong_password', $user->password);
            echo "   ✅ Password verification working (result: " . ($isValid ? 'true' : 'false') . ")\n";
        } else {
            echo "   ⚠️ User has no password hash\n";
        }
    }
    echo "\n";
} catch (Exception $e) {
    echo "   ❌ Login simulation error: " . $e->getMessage() . "\n\n";
}

echo "🔍 Login debug test completed!\n";
echo "💡 Check the output above to identify the issue.\n";
