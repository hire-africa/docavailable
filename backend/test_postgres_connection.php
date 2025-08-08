<?php
// Test PostgreSQL Connection
echo "Testing PostgreSQL Connection...\n";
echo "==============================\n\n";

try {
    // Test direct PDO connection
    echo "Testing direct PDO connection...\n";
    $dsn = "pgsql:host=127.0.0.1;port=5432;dbname=docavailable;sslmode=prefer";
    $username = 'docavailable_user';
    $password = 'your_password_here'; // Replace with your actual password
    
    $pdo = new PDO($dsn, $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "✅ Direct PDO connection successful!\n";
    
    // Test a simple query
    $stmt = $pdo->query("SELECT version()");
    $version = $stmt->fetchColumn();
    echo "PostgreSQL Version: " . $version . "\n";
    
    // Test Laravel connection
    echo "\nTesting Laravel connection...\n";
    require_once 'vendor/autoload.php';
    
    $app = require_once 'bootstrap/app.php';
    $app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
    
    $laravelPdo = DB::connection()->getPdo();
    echo "✅ Laravel connection successful!\n";
    echo "Database: " . DB::connection()->getDatabaseName() . "\n";
    echo "Server: " . $laravelPdo->getAttribute(PDO::ATTR_SERVER_VERSION) . "\n";
    
    echo "\n🎉 All connection tests passed!\n";
    
} catch (PDOException $e) {
    echo "❌ Connection failed: " . $e->getMessage() . "\n";
    echo "Error code: " . $e->getCode() . "\n";
    
    echo "\nTroubleshooting tips:\n";
    echo "1. Make sure PostgreSQL is running\n";
    echo "2. Check if the database 'docavailable' exists\n";
    echo "3. Verify username and password\n";
    echo "4. Ensure PHP PostgreSQL extension is installed\n";
} catch (Exception $e) {
    echo "❌ Laravel connection failed: " . $e->getMessage() . "\n";
} 