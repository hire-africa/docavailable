<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

echo "🔍 Testing Email Verification Debug...\n";
echo "=====================================\n\n";

// Test email
$email = 'test@example.com';
$code = '123456';

echo "📧 Test Email: $email\n";
echo "🔑 Test Code: $code\n\n";

// Test 1: Check cache configuration
echo "1️⃣ Testing cache configuration...\n";
try {
    $cacheDriver = config('cache.default');
    echo "   Cache Driver: $cacheDriver\n";
    
    // Test cache functionality
    $testKey = 'test_verification_' . time();
    Cache::put($testKey, 'test_value', 60);
    $retrieved = Cache::get($testKey);
    Cache::forget($testKey);
    
    if ($retrieved === 'test_value') {
        echo "   ✅ Cache is working correctly\n\n";
    } else {
        echo "   ❌ Cache is not working correctly\n\n";
    }
} catch (Exception $e) {
    echo "   ❌ Cache error: " . $e->getMessage() . "\n\n";
}

// Test 2: Simulate sending verification code
echo "2️⃣ Simulating send verification code...\n";
try {
    $cacheKey = 'email_verification_' . $email;
    Cache::put($cacheKey, $code, now()->addMinutes(10));
    
    $storedCode = Cache::get($cacheKey);
    if ($storedCode === $code) {
        echo "   ✅ Code stored in cache successfully\n";
        echo "   📝 Stored code: $storedCode\n\n";
    } else {
        echo "   ❌ Code not stored correctly\n";
        echo "   📝 Expected: $code, Got: $storedCode\n\n";
    }
} catch (Exception $e) {
    echo "   ❌ Error storing code: " . $e->getMessage() . "\n\n";
}

// Test 3: Simulate verification
echo "3️⃣ Simulating verification...\n";
try {
    $cacheKey = 'email_verification_' . $email;
    $storedCode = Cache::get($cacheKey);
    
    if (!$storedCode) {
        echo "   ❌ No code found in cache\n\n";
    } else {
        echo "   📝 Found code in cache: $storedCode\n";
        
        if ($code === $storedCode) {
            echo "   ✅ Code matches!\n";
            
            // Remove from cache
            Cache::forget($cacheKey);
            echo "   🗑️ Code removed from cache\n\n";
        } else {
            echo "   ❌ Code doesn't match\n";
            echo "   📝 Expected: $code, Got: $storedCode\n\n";
        }
    }
} catch (Exception $e) {
    echo "   ❌ Error during verification: " . $e->getMessage() . "\n\n";
}

// Test 4: Check storage permissions
echo "4️⃣ Checking storage permissions...\n";
try {
    $cachePath = storage_path('framework/cache/data');
    if (is_dir($cachePath)) {
        echo "   ✅ Cache directory exists: $cachePath\n";
        
        if (is_writable($cachePath)) {
            echo "   ✅ Cache directory is writable\n\n";
        } else {
            echo "   ❌ Cache directory is not writable\n\n";
        }
    } else {
        echo "   ❌ Cache directory does not exist: $cachePath\n\n";
    }
} catch (Exception $e) {
    echo "   ❌ Error checking storage: " . $e->getMessage() . "\n\n";
}

// Test 5: Check if the issue might be with the request validation
echo "5️⃣ Testing request validation...\n";
try {
    $validator = \Illuminate\Support\Facades\Validator::make([
        'email' => $email,
        'code' => $code
    ], [
        'email' => 'required|email',
        'code' => 'required|string|size:6',
    ]);
    
    if ($validator->fails()) {
        echo "   ❌ Validation failed:\n";
        foreach ($validator->errors()->all() as $error) {
            echo "      - $error\n";
        }
        echo "\n";
    } else {
        echo "   ✅ Validation passed\n\n";
    }
} catch (Exception $e) {
    echo "   ❌ Validation error: " . $e->getMessage() . "\n\n";
}

echo "🔍 Debug test completed!\n";
echo "💡 If all tests pass, the issue might be in the API endpoint or middleware.\n";
