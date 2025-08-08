<?php

require_once __DIR__ . '/vendor/autoload.php';

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
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

// Bootstrap Laravel application
$app = Application::configure(basePath: __DIR__)
    ->withRouting(
        web: __DIR__ . '/routes/web.php',
        api: __DIR__ . '/routes/api.php',
        commands: __DIR__ . '/routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        //
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();

// Register our custom service provider manually
$app->register(CustomDatabaseServiceProvider::class);

// Test the custom database connection
try {
    echo "🔍 Testing custom database connection...\n";
    
    // Debug: Print environment variables
    echo "📋 DB_URL: " . env('DB_URL') . "\n";
    echo "📋 DB_HOST: " . env('DB_HOST') . "\n";
    echo "📋 DB_DATABASE: " . env('DB_DATABASE') . "\n";
    echo "📋 DB_USERNAME: " . env('DB_USERNAME') . "\n";
    
    // Get the custom connection
    $connection = $app->make('db.custom');
    
    echo "✅ Custom connection created successfully\n";
    
    // Test a simple query
    $result = $connection->select('SELECT version() as version');
    
    echo "✅ Database query successful\n";
    echo "📊 PostgreSQL Version: " . $result[0]->version . "\n";
    
    // Test if we can access the database name
    $dbName = $connection->getDatabaseName();
    echo "📊 Database Name: " . $dbName . "\n";
    
    echo "\n🎉 Custom database connection is working! Laravel 12 connector bug bypassed.\n";
    
} catch (Exception $e) {
    echo "❌ Error testing custom connection: " . $e->getMessage() . "\n";
    echo "📋 Stack trace:\n" . $e->getTraceAsString() . "\n";
} 