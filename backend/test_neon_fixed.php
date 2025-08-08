<?php
// Fixed test for Neon PostgreSQL connection
echo "Testing Neon PostgreSQL Connection (Fixed)...\n";
echo "===========================================\n";

try {
    // Method 1: Using the exact format from Neon documentation
    echo "Method 1: Direct connection with endpoint parameter\n";
    $dsn = 'pgsql:host=ep-hidden-brook-aemmopjb-pooler.c-2.us-east-2.aws.neon.tech;port=5432;dbname=neondb;sslmode=require;options=endpoint%3Dep-hidden-brook-aemmopjb';
    
    echo "DSN: " . $dsn . "\n";
    
    $pdo = new PDO($dsn, 'neondb_owner', 'npg_FjoWxz8OU4CQ');
    echo "✅ Method 1 successful!\n";
    
    // Test query
    $stmt = $pdo->query('SELECT version() as version');
    $result = $stmt->fetch();
    echo "✅ Query successful! PostgreSQL version: " . $result['version'] . "\n";
    
} catch (Exception $e) {
    echo "❌ Method 1 failed: " . $e->getMessage() . "\n";
    
    // Method 2: Try with URL format
    try {
        echo "\nMethod 2: Using URL format\n";
        $url = 'postgresql://neondb_owner:npg_FjoWxz8OU4CQ@ep-hidden-brook-aemmopjb-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&options=endpoint%3Dep-hidden-brook-aemmopjb';
        
        echo "URL: " . $url . "\n";
        
        $pdo = new PDO($url);
        echo "✅ Method 2 successful!\n";
        
        // Test query
        $stmt = $pdo->query('SELECT version() as version');
        $result = $stmt->fetch();
        echo "✅ Query successful! PostgreSQL version: " . $result['version'] . "\n";
        
    } catch (Exception $e2) {
        echo "❌ Method 2 failed: " . $e2->getMessage() . "\n";
        
        // Method 3: Try without pooler
        try {
            echo "\nMethod 3: Using direct endpoint (no pooler)\n";
            $dsn = 'pgsql:host=ep-hidden-brook-aemmopjb.c-2.us-east-2.aws.neon.tech;port=5432;dbname=neondb;sslmode=require;options=endpoint%3Dep-hidden-brook-aemmopjb';
            
            echo "DSN: " . $dsn . "\n";
            
            $pdo = new PDO($dsn, 'neondb_owner', 'npg_FjoWxz8OU4CQ');
            echo "✅ Method 3 successful!\n";
            
            // Test query
            $stmt = $pdo->query('SELECT version() as version');
            $result = $stmt->fetch();
            echo "✅ Query successful! PostgreSQL version: " . $result['version'] . "\n";
            
        } catch (Exception $e3) {
            echo "❌ Method 3 failed: " . $e3->getMessage() . "\n";
            echo "\nAll methods failed. Please check your Neon configuration.\n";
        }
    }
}

echo "\n🎉 Test completed!\n"; 