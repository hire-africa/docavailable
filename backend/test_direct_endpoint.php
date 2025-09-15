<?php
// Test using direct endpoint (no pooler)
require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "Testing Direct Endpoint Connection...\n";
echo "====================================\n";

try {
    // Test with direct endpoint (no pooler)
    $dsn = 'pgsql:host=ep-hidden-brook-aemmopjb.c-2.us-east-2.aws.neon.tech;port=5432;dbname=neondb;sslmode=require;options=endpoint%3Dep-hidden-brook-aemmopjb';
    
    echo "DSN: " . $dsn . "\n";
    
    $pdo = new PDO($dsn, 'neondb_owner', 'npg_FjoWxz8OU4CQ');
    echo "✅ Direct endpoint connection successful!\n";
    
    // Test query
    $stmt = $pdo->query('SELECT version() as version');
    $result = $stmt->fetch();
    echo "✅ Query successful! PostgreSQL version: " . $result['version'] . "\n";
    
    echo "\n🎉 Direct endpoint test passed!\n";
    
} catch (Exception $e) {
    echo "❌ Direct endpoint failed: " . $e->getMessage() . "\n";
    echo "Error code: " . $e->getCode() . "\n";
} 