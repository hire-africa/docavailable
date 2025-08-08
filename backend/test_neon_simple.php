<?php
// Simple test for Neon PostgreSQL connection
echo "Testing Neon PostgreSQL Connection (Simple)...\n";
echo "=============================================\n";

try {
    // Test with the exact format Neon recommends
    $dsn = 'pgsql:host=ep-hidden-brook-aemmopjb-pooler.c-2.us-east-2.aws.neon.tech;port=5432;dbname=neondb;sslmode=require';
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ];
    
    // Add the endpoint parameter as a query parameter
    $dsn .= ';options=endpoint%3Dep-hidden-brook-aemmopjb';
    
    echo "DSN: " . $dsn . "\n";
    
    $pdo = new PDO($dsn, 'neondb_owner', 'npg_FjoWxz8OU4CQ', $options);
    echo "✅ Direct PDO connection successful!\n";
    
    // Test a simple query
    $stmt = $pdo->query('SELECT version() as version');
    $result = $stmt->fetch();
    echo "✅ Query successful! PostgreSQL version: " . $result['version'] . "\n";
    
    echo "\n🎉 Connection test passed!\n";
    
} catch (Exception $e) {
    echo "❌ Connection failed: " . $e->getMessage() . "\n";
    echo "Error code: " . $e->getCode() . "\n";
} 