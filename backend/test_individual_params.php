<?php
// Test using individual parameters with endpoint option
require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "Testing Individual Parameters with Endpoint...\n";
echo "============================================\n";

try {
    // Test with individual parameters
    $host = 'ep-hidden-brook-aemmopjb-pooler.c-2.us-east-2.aws.neon.tech';
    $port = 5432;
    $database = 'neondb';
    $username = 'neondb_owner';
    $password = 'npg_FjoWxz8OU4CQ';
    
    // Build DSN with endpoint parameter
    $dsn = "pgsql:host=$host;port=$port;dbname=$database;sslmode=require;options=endpoint%3Dep-hidden-brook-aemmopjb";
    
    echo "DSN: " . $dsn . "\n";
    
    $pdo = new PDO($dsn, $username, $password);
    echo "✅ Individual parameters connection successful!\n";
    
    // Test query
    $stmt = $pdo->query('SELECT version() as version');
    $result = $stmt->fetch();
    echo "✅ Query successful! PostgreSQL version: " . $result['version'] . "\n";
    
    echo "\n🎉 Individual parameters test passed!\n";
    
} catch (Exception $e) {
    echo "❌ Individual parameters failed: " . $e->getMessage() . "\n";
    echo "Error code: " . $e->getCode() . "\n";
} 