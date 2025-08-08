<?php
// Alternative test using the exact connection string you provided
echo "Testing Neon PostgreSQL Connection (Alternative)...\n";
echo "================================================\n";

// Your original connection string
$connectionString = 'postgresql://neondb_owner:npg_FjoWxz8OU4CQ@ep-hidden-brook-aemmopjb-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

echo "Using your original connection string:\n";
echo $connectionString . "\n\n";

try {
    // Method 1: Direct PDO with connection string
    echo "Method 1: Direct PDO with connection string\n";
    $pdo = new PDO($connectionString);
    echo "✅ Method 1 successful!\n";
    
    // Test query
    $stmt = $pdo->query('SELECT version() as version');
    $result = $stmt->fetch();
    echo "✅ Query successful! PostgreSQL version: " . $result['version'] . "\n";
    
} catch (Exception $e) {
    echo "❌ Method 1 failed: " . $e->getMessage() . "\n";
    
    // Method 2: Parse the connection string manually
    try {
        echo "\nMethod 2: Parsed connection string\n";
        
        // Parse the connection string
        $url = parse_url($connectionString);
        $host = $url['host'];
        $port = $url['port'] ?? 5432;
        $database = trim($url['path'], '/');
        $username = $url['user'];
        $password = $url['pass'];
        
        // Build DSN
        $dsn = "pgsql:host=$host;port=$port;dbname=$database;sslmode=require";
        
        echo "DSN: " . $dsn . "\n";
        
        $pdo = new PDO($dsn, $username, $password);
        echo "✅ Method 2 successful!\n";
        
        // Test query
        $stmt = $pdo->query('SELECT version() as version');
        $result = $stmt->fetch();
        echo "✅ Query successful! PostgreSQL version: " . $result['version'] . "\n";
        
    } catch (Exception $e2) {
        echo "❌ Method 2 failed: " . $e2->getMessage() . "\n";
        
        // Method 3: Try with endpoint parameter
        try {
            echo "\nMethod 3: With endpoint parameter\n";
            
            $dsn = "pgsql:host=$host;port=$port;dbname=$database;sslmode=require;options=endpoint%3Dep-hidden-brook-aemmopjb";
            
            echo "DSN: " . $dsn . "\n";
            
            $pdo = new PDO($dsn, $username, $password);
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