<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "🔍 Force Database Connection Test\n";
echo "================================\n\n";

// Force set the database connection
config(['database.default' => 'pgsql_simple']);

// Test environment variables
echo "📋 Environment Variables:\n";
echo "DB_CONNECTION: " . (env('DB_CONNECTION') ?: 'NOT SET') . "\n";
echo "DB_HOST: " . (env('DB_HOST') ?: 'NOT SET') . "\n";
echo "DB_PORT: " . (env('DB_PORT') ?: 'NOT SET') . "\n";
echo "DB_DATABASE: " . (env('DB_DATABASE') ?: 'NOT SET') . "\n";
echo "DB_USERNAME: " . (env('DB_USERNAME') ?: 'NOT SET') . "\n";
echo "DB_PASSWORD: " . (env('DB_PASSWORD') ? 'SET' : 'NOT SET') . "\n";
echo "DB_URL: " . (env('DB_URL') ? 'SET' : 'NOT SET') . "\n";
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
    
} catch (Exception $e) {
    echo "❌ Database connection failed: " . $e->getMessage() . "\n";
    echo "Error code: " . $e->getCode() . "\n";
}

echo "\n🔍 Test complete.\n";