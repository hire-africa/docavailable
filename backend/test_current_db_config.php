<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔍 Testing Current Database Configuration...\n";
echo "==========================================\n\n";

// Check environment
echo "1️⃣ Environment Information:\n";
echo "   📊 APP_ENV: " . env('APP_ENV', 'not set') . "\n";
echo "   📊 APP_DEBUG: " . (env('APP_DEBUG', false) ? 'true' : 'false') . "\n";
echo "   📊 Current environment: " . app()->environment() . "\n\n";

// Check database configuration
echo "2️⃣ Database Configuration:\n";
echo "   📊 DB_CONNECTION: " . env('DB_CONNECTION', 'not set') . "\n";
echo "   📊 DB_HOST: " . env('DB_HOST', 'not set') . "\n";
echo "   📊 DB_PORT: " . env('DB_PORT', 'not set') . "\n";
echo "   📊 DB_DATABASE: " . env('DB_DATABASE', 'not set') . "\n";
echo "   📊 DB_USERNAME: " . env('DB_USERNAME', 'not set') . "\n";
echo "   📊 DB_PASSWORD: " . (env('DB_PASSWORD') ? substr(env('DB_PASSWORD'), 0, 10) . '...' : 'not set') . "\n";
echo "   📊 DB_URL: " . (env('DB_URL') ? substr(env('DB_URL'), 0, 50) . '...' : 'not set') . "\n\n";

// Test database connection
echo "3️⃣ Testing Database Connection:\n";
try {
    $pdo = DB::connection()->getPdo();
    echo "   ✅ Database connection successful\n";
    echo "   📊 Database: " . DB::connection()->getDatabaseName() . "\n";
    echo "   🔗 Driver: " . DB::connection()->getDriverName() . "\n";
    
    // Test a simple query
    $userCount = DB::table('users')->count();
    echo "   👥 Users in database: {$userCount}\n\n";
    
} catch (Exception $e) {
    echo "   ❌ Database connection failed: " . $e->getMessage() . "\n\n";
}

// Check if we're using the correct database
echo "4️⃣ Database Host Check:\n";
$currentHost = env('DB_HOST');
if (strpos($currentHost, 'ep-royal-term') !== false) {
    echo "   ✅ Using correct database (ep-royal-term)\n";
} elseif (strpos($currentHost, 'ep-hidden-brook') !== false) {
    echo "   ❌ Using old database (ep-hidden-brook) - this needs to be fixed\n";
} else {
    echo "   ⚠️  Using unknown database: {$currentHost}\n";
}

echo "\n🔍 Database configuration test completed!\n";
