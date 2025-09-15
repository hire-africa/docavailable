<?php

try {
    $pdo = new PDO('sqlite:backend/database/database.sqlite');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Get all columns from users table
    $stmt = $pdo->query("PRAGMA table_info(users)");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Users table columns:\n";
    foreach ($columns as $column) {
        echo "- " . $column['name'] . " (" . $column['type'] . ")\n";
    }
    echo "\n";
    
    // Get the specific doctor's data
    $stmt = $pdo->query('SELECT * FROM users WHERE email = "banda@gmail.com"');
    $doctor = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($doctor) {
        echo "Doctor data for banda@gmail.com:\n";
        foreach ($doctor as $key => $value) {
            if ($value !== null) {
                echo "- $key: " . (strlen($value) > 100 ? substr($value, 0, 100) . '...' : $value) . "\n";
            }
        }
    } else {
        echo "Doctor not found\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
} 