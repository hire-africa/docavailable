<?php

/**
 * Digital Ocean Database Connection Test
 * 
 * This script tests the connection to your Digital Ocean database
 */

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "🔍 Digital Ocean Database Connection Test\n";
echo "========================================\n\n";

// Test environment variables
echo "📋 Environment Variables:\n";
echo "DB_CONNECTION: " . (env('DB_CONNECTION') ?: 'NOT SET') . "\n";
echo "DB_HOST: " . (env('DB_HOST') ?: 'NOT SET') . "\n";
echo "DB_PORT: " . (env('DB_PORT') ?: 'NOT SET') . "\n";
echo "DB_DATABASE: " . (env('DB_DATABASE') ?: 'NOT SET') . "\n";
echo "DB_USERNAME: " . (env('DB_USERNAME') ?: 'NOT SET') . "\n";
echo "DB_PASSWORD: " . (env('DB_PASSWORD') ? 'SET (' . strlen(env('DB_PASSWORD')) . ' characters)' : 'NOT SET') . "\n";
echo "DB_SSLMODE: " . (env('DB_SSLMODE') ?: 'NOT SET') . "\n\n";

// Test configuration
echo "📋 Database Configuration:\n";
echo "Default connection: " . config('database.default') . "\n";
echo "Available connections: " . implode(', ', array_keys(config('database.connections'))) . "\n\n";

// Test database connection
echo "🔌 Testing Database Connection:\n";
try {
    $connection = DB::connection();
    $pdo = $connection->getPdo();
    echo "✅ Database connection successful!\n";
    echo "Connection name: " . $connection->getName() . "\n";
    echo "Database name: " . $connection->getDatabaseName() . "\n";
    
    // Test a simple query
    $result = $connection->select('SELECT version() as version');
    echo "PostgreSQL version: " . $result[0]->version . "\n";
    
    // Test if users table exists
    $tables = $connection->select("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'");
    if (count($tables) > 0) {
        echo "✅ Users table exists\n";
        
        // Test user count
        $userCount = $connection->select('SELECT COUNT(*) as count FROM users');
        echo "User count: " . $userCount[0]->count . "\n";
    } else {
        echo "⚠️  Users table does not exist - you may need to run migrations\n";
    }
    
} catch (Exception $e) {
    echo "❌ Database connection failed: " . $e->getMessage() . "\n";
    echo "Error code: " . $e->getCode() . "\n";
    
    if (strpos($e->getMessage(), 'password authentication failed') !== false) {
        echo "\n💡 This looks like a password authentication error.\n";
        echo "Please check your DB_PASSWORD in the .env file.\n";
    } elseif (strpos($e->getMessage(), 'could not connect to server') !== false) {
        echo "\n💡 This looks like a connection error.\n";
        echo "Please check your DB_HOST and DB_PORT in the .env file.\n";
    }
}

echo "\n🔍 Test complete.\n";
