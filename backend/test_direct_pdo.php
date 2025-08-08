<?php
// Direct PDO test for Neon PostgreSQL
echo "Testing Direct PDO Connection to Neon...\n";
echo "=======================================\n";

try {
    // Method 1: Direct PDO with exact Neon format
    echo "Method 1: Direct PDO connection\n";
    $dsn = 'pgsql:host=ep-hidden-brook-aemmopjb-pooler.c-2.us-east-2.aws.neon.tech;port=5432;dbname=neondb;sslmode=require;options=endpoint%3Dep-hidden-brook-aemmopjb';
    
    echo "DSN: " . $dsn . "\n";
    
    $pdo = new PDO($dsn, 'neondb_owner', 'npg_FjoWxz8OU4CQ');
    echo "✅ Direct PDO connection successful!\n";
    
    // Test query
    $stmt = $pdo->query('SELECT version() as version');
    $result = $stmt->fetch();
    echo "✅ Query successful! PostgreSQL version: " . $result['version'] . "\n";
    
    echo "\n🎉 Direct PDO test passed!\n";
    
} catch (Exception $e) {
    echo "❌ Direct PDO failed: " . $e->getMessage() . "\n";
    echo "Error code: " . $e->getCode() . "\n";
    
    // Method 2: Try without pooler
    try {
        echo "\nMethod 2: Direct endpoint (no pooler)\n";
        $dsn = 'pgsql:host=ep-hidden-brook-aemmopjb.c-2.us-east-2.aws.neon.tech;port=5432;dbname=neondb;sslmode=require;options=endpoint%3Dep-hidden-brook-aemmopjb';
        
        echo "DSN: " . $dsn . "\n";
        
        $pdo = new PDO($dsn, 'neondb_owner', 'npg_FjoWxz8OU4CQ');
        echo "✅ Direct endpoint connection successful!\n";
        
        // Test query
        $stmt = $pdo->query('SELECT version() as version');
        $result = $stmt->fetch();
        echo "✅ Query successful! PostgreSQL version: " . $result['version'] . "\n";
        
        echo "\n🎉 Direct endpoint test passed!\n";
        
    } catch (Exception $e2) {
        echo "❌ Direct endpoint failed: " . $e2->getMessage() . "\n";
        echo "Error code: " . $e2->getCode() . "\n";
        
        echo "\n❌ All methods failed. Your PHP PostgreSQL extension needs updating.\n";
        echo "Please update your PHP PostgreSQL extension to support SNI.\n";
    }
} 