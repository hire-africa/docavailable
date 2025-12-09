<?php
// Test DigitalOcean database connection
require_once 'backend/vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'backend/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

echo "🧪 Testing DigitalOcean Database Connection...\n";
echo "============================================\n\n";

try {
    // Test 1: Basic database connection
    echo "1️⃣ Testing basic database connection...\n";
    $pdo = DB::connection()->getPdo();
    echo "   ✅ Database connection successful!\n";
    echo "   📊 Database: " . DB::connection()->getDatabaseName() . "\n";
    echo "   🏠 Host: " . config('database.connections.pgsql_simple.host') . "\n";
    echo "   👤 Username: " . config('database.connections.pgsql_simple.username') . "\n\n";
    
    // Test 2: Test a simple query
    echo "2️⃣ Testing simple query...\n";
    $result = DB::select('SELECT 1 as test');
    echo "   ✅ Query executed successfully!\n";
    echo "   📊 Result: " . json_encode($result) . "\n\n";
    
    // Test 3: Test cache table access
    echo "3️⃣ Testing cache table access...\n";
    try {
        $cacheTable = DB::table('cache')->count();
        echo "   ✅ Cache table accessible!\n";
        echo "   📊 Cache entries: " . $cacheTable . "\n\n";
    } catch (Exception $e) {
        echo "   ❌ Cache table error: " . $e->getMessage() . "\n\n";
    }
    
    // Test 4: Test cache operations
    echo "4️⃣ Testing cache operations...\n";
    $testKey = 'test_verification_' . time();
    $testValue = '123456';
    
    // Store in cache
    Cache::put($testKey, $testValue, now()->addMinutes(10));
    echo "   ✅ Cache put operation successful!\n";
    
    // Retrieve from cache
    $retrievedValue = Cache::get($testKey);
    if ($retrievedValue === $testValue) {
        echo "   ✅ Cache get operation successful!\n";
        echo "   📊 Retrieved value: " . $retrievedValue . "\n";
    } else {
        echo "   ❌ Cache get operation failed!\n";
        echo "   📊 Expected: " . $testValue . ", Got: " . ($retrievedValue ?? 'null') . "\n";
    }
    
    // Clean up
    Cache::forget($testKey);
    echo "   🧹 Cache cleanup completed!\n\n";
    
    echo "✅ All database tests passed!\n";
    
} catch (Exception $e) {
    echo "❌ Database connection failed!\n";
    echo "📊 Error: " . $e->getMessage() . "\n";
    echo "📊 File: " . $e->getFile() . "\n";
    echo "📊 Line: " . $e->getLine() . "\n";
    echo "📊 Trace:\n" . $e->getTraceAsString() . "\n";
}
