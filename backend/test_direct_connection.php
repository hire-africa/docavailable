<?php

require_once __DIR__ . '/vendor/autoload.php';

use App\Providers\CustomDatabaseServiceProvider;

// Load .env file manually
if (file_exists(__DIR__ . '/.env')) {
    $lines = file(__DIR__ . '/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '=') !== false && strpos($line, '#') !== 0) {
            list($key, $value) = explode('=', $line, 2);
            $_ENV[$key] = $value;
            putenv("$key=$value");
        }
    }
}

// Test the custom connection directly
try {
    echo "🔍 Testing direct custom connection...\n";
    
    // Create a mock app instance
    $app = new stdClass();
    $provider = new CustomDatabaseServiceProvider($app);
    $connection = $provider->createCustomConnection();
    
    echo "✅ Custom connection created successfully\n";
    
    // Test a simple query
    $result = $connection->select('SELECT version() as version');
    
    echo "✅ Database query successful\n";
    echo "📊 PostgreSQL Version: " . $result[0]->version . "\n";
    
    echo "\n🎉 Direct custom connection is working!\n";
    
} catch (Exception $e) {
    echo "❌ Error testing direct connection: " . $e->getMessage() . "\n";
    echo "📋 Stack trace:\n" . $e->getTraceAsString() . "\n";
} 