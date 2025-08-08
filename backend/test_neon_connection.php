<?php

// Test Neon PostgreSQL connection
echo "Testing Neon PostgreSQL connection...\n";

try {
    // Use Neon's recommended connection string format
    $connectionString = "postgresql://neondb_owner:npg_FjoWxz8OU4CQ@ep-hidden-brook-aemmopjb-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&options=endpoint%3Dep-hidden-brook-aemmopjb";
    
    echo "Connection string: " . $connectionString . "\n";
    
    // Create PDO connection using the connection string
    $pdo = new PDO($connectionString);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "✓ Connection successful!\n";
    
    // Test a simple query
    $stmt = $pdo->query("SELECT version()");
    $version = $stmt->fetchColumn();
    echo "PostgreSQL Version: " . $version . "\n";
    
} catch (PDOException $e) {
    echo "✗ Connection failed: " . $e->getMessage() . "\n";
} 