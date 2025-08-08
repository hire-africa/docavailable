<?php
// Final test for Neon PostgreSQL connection
require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "Testing Final Neon PostgreSQL Connection...\n";
echo "==========================================\n";

try {
    // Test Laravel DB connection
    echo "Testing Laravel DB connection...\n";
    $laravelPdo = DB::connection()->getPdo();
    echo "✅ Laravel DB connection successful!\n";
    
    // Get database info
    echo "Database information:\n";
    echo "   - Database name: " . DB::connection()->getDatabaseName() . "\n";
    echo "   - Server version: " . $laravelPdo->getAttribute(PDO::ATTR_SERVER_VERSION) . "\n";
    
    // Test a simple query
    echo "Testing simple query...\n";
    $result = DB::select('SELECT version() as version');
    echo "✅ Query successful! PostgreSQL version: " . $result[0]->version . "\n";
    
    echo "\n🎉 Final connection test passed!\n";
    
} catch (Exception $e) {
    echo "❌ Final connection failed: " . $e->getMessage() . "\n";
    echo "Error code: " . $e->getCode() . "\n";
} 