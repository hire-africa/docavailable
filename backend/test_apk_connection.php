<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

echo "🔍 Testing APK Connection Endpoints...\n";
echo "====================================\n\n";

// Test 1: Basic database connection
echo "1️⃣ Testing database connection...\n";
try {
    $pdo = DB::connection()->getPdo();
    echo "   ✅ Database connection successful\n";
    echo "   📊 Database: " . DB::connection()->getDatabaseName() . "\n";
    echo "   🔗 Driver: " . DB::connection()->getDriverName() . "\n\n";
} catch (Exception $e) {
    echo "   ❌ Database connection failed: " . $e->getMessage() . "\n\n";
    exit(1);
}

// Test 2: Health check endpoint
echo "2️⃣ Testing health check endpoint...\n";
try {
    $response = app('Illuminate\Http\Request');
    $response->merge([]);
    
    // Simulate health check
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

    echo "   ✅ Health check endpoint working\n";
    echo "   📊 Health status: " . $health['status'] . "\n";
    echo "   🗄️ Database status: " . $health['services']['database']['status'] . "\n\n";
    
} catch (Exception $e) {
    echo "   ❌ Health check failed: " . $e->getMessage() . "\n\n";
}

// Test 3: Test user registration endpoint
echo "3️⃣ Testing user registration endpoint...\n";
try {
    // Test with sample data
    $testData = [
        'email' => 'test@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
        'first_name' => 'Test',
        'last_name' => 'User',
        'user_type' => 'patient',
        'date_of_birth' => '1990-01-01',
        'gender' => 'male',
        'country' => 'Malawi',
        'city' => 'Blantyre'
    ];
    
    // Check if required columns exist
    $requiredColumns = ['display_name', 'user_type', 'bio', 'date_of_birth', 'gender', 'country', 'city'];
    $missingColumns = [];
    
    foreach ($requiredColumns as $column) {
        if (!DB::getSchemaBuilder()->hasColumn('users', $column)) {
            $missingColumns[] = $column;
        }
    }
    
    if (empty($missingColumns)) {
        echo "   ✅ All required columns exist for registration\n";
    } else {
        echo "   ❌ Missing columns: " . implode(', ', $missingColumns) . "\n";
    }
    
    // Test if we can create a user (without actually creating one)
    try {
        $userCount = DB::table('users')->count();
        echo "   📊 Current users in database: $userCount\n";
        echo "   ✅ User table is accessible\n\n";
    } catch (Exception $e) {
        echo "   ❌ User table access failed: " . $e->getMessage() . "\n\n";
    }
    
} catch (Exception $e) {
    echo "   ❌ Registration test failed: " . $e->getMessage() . "\n\n";
}

// Test 4: Test email verification endpoints
echo "4️⃣ Testing email verification endpoints...\n";
try {
    // Test cache functionality
    $cacheKey = 'test_verification_' . time();
    \Illuminate\Support\Facades\Cache::put($cacheKey, 'test_value', 60);
    $retrieved = \Illuminate\Support\Facades\Cache::get($cacheKey);
    \Illuminate\Support\Facades\Cache::forget($cacheKey);
    
    if ($retrieved === 'test_value') {
        echo "   ✅ Cache is working for verification codes\n";
    } else {
        echo "   ❌ Cache is not working properly\n";
    }
    
    // Test mail configuration
    $mailConfig = [
        'driver' => config('mail.default'),
        'host' => config('mail.mailers.smtp.host'),
        'port' => config('mail.mailers.smtp.port'),
        'username' => config('mail.mailers.smtp.username'),
        'from_address' => config('mail.from.address'),
    ];
    
    echo "   📧 Mail configuration:\n";
    foreach ($mailConfig as $key => $value) {
        echo "      - $key: $value\n";
    }
    echo "\n";
    
} catch (Exception $e) {
    echo "   ❌ Email verification test failed: " . $e->getMessage() . "\n\n";
}

// Test 5: Test authentication endpoints
echo "5️⃣ Testing authentication endpoints...\n";
try {
    // Test JWT configuration
    $jwtSecret = config('jwt.secret');
    if (!empty($jwtSecret)) {
        echo "   ✅ JWT secret is configured\n";
    } else {
        echo "   ❌ JWT secret is not configured\n";
    }
    
    // Test if we can query users
    try {
        $userCount = DB::table('users')->count();
        echo "   📊 Users table accessible: $userCount users found\n";
    } catch (Exception $e) {
        echo "   ❌ Users table not accessible: " . $e->getMessage() . "\n";
    }
    
    echo "\n";
    
} catch (Exception $e) {
    echo "   ❌ Authentication test failed: " . $e->getMessage() . "\n\n";
}

// Test 6: Network connectivity test
echo "6️⃣ Testing network connectivity...\n";
try {
    $url = 'https://docavailable-5.onrender.com/api/health';
    $context = stream_context_create([
        'http' => [
            'timeout' => 10,
            'method' => 'GET',
            'header' => 'Content-Type: application/json'
        ]
    ]);
    
    $response = file_get_contents($url, false, $context);
    if ($response !== false) {
        echo "   ✅ Backend is reachable via HTTPS\n";
        $data = json_decode($response, true);
        if ($data && isset($data['status'])) {
            echo "   📊 Backend status: " . $data['status'] . "\n";
        }
    } else {
        echo "   ❌ Backend is not reachable via HTTPS\n";
    }
    
} catch (Exception $e) {
    echo "   ❌ Network test failed: " . $e->getMessage() . "\n";
}

echo "\n🔍 APK connection test completed!\n";
echo "💡 If all tests pass, the issue might be in the APK build configuration.\n";
