<?php

// Database configuration for SQLite
$databasePath = __DIR__ . '/../backend/database/database.sqlite';

// Admin account details
$adminData = [
    'first_name' => 'Admin',
    'last_name' => 'User',
    'email' => 'admin@doc.com',
    'password' => '000000009',
    'display_name' => 'Admin User',
    'user_type' => 'admin',
    'status' => 'active'
];

try {
    // Check if database file exists
    if (!file_exists($databasePath)) {
        echo "❌ Database file not found at: $databasePath\n";
        echo "Please make sure the Laravel database is set up and migrated.\n";
        exit(1);
    }
    
    // Connect to SQLite database
    $pdo = new PDO("sqlite:$databasePath");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "Connected to SQLite database successfully.\n";
    
    // Hash the password using Laravel's bcrypt
    $hashedPassword = password_hash($adminData['password'], PASSWORD_BCRYPT);
    
    echo "Password hashed successfully.\n";
    
    // Check if admin already exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$adminData['email']]);
    
    if ($stmt->fetch()) {
        echo "❌ Admin account already exists with email: {$adminData['email']}\n";
        exit(1);
    }
    
    // Insert admin account
    $sql = "INSERT INTO users (
        first_name, last_name, email, password, display_name, 
        user_type, status, email_verified_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'))";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $adminData['first_name'],
        $adminData['last_name'],
        $adminData['email'],
        $hashedPassword,
        $adminData['display_name'],
        $adminData['user_type'],
        $adminData['status']
    ]);
    
    $adminId = $pdo->lastInsertId();
    
    echo "✅ Admin account created successfully!\n";
    echo "User ID: $adminId\n";
    echo "Email: {$adminData['email']}\n";
    echo "Password: {$adminData['password']}\n";
    echo "\nYou can now login to the admin dashboard with these credentials.\n";
    
    // Verify the insertion
    $stmt = $pdo->prepare("SELECT id, first_name, last_name, email, user_type, status, created_at FROM users WHERE id = ?");
    $stmt->execute([$adminId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo "\nVerification:\n";
    print_r($user);
    
} catch (PDOException $e) {
    echo "❌ Database error: " . $e->getMessage() . "\n";
    exit(1);
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
} 