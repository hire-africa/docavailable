<?php

try {
    $pdo = new PDO('sqlite:backend/database/database.sqlite');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $stmt = $pdo->query('SELECT id, email, user_type, status FROM users WHERE email = "admin@docavailable.com"');
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($result) {
        echo "✅ Admin account exists:\n";
        echo "ID: " . $result['id'] . "\n";
        echo "Email: " . $result['email'] . "\n";
        echo "User Type: " . $result['user_type'] . "\n";
        echo "Status: " . $result['status'] . "\n";
    } else {
        echo "❌ Admin account not found\n";
        echo "Creating admin account...\n";
        
        $hashedPassword = password_hash('admin123456', PASSWORD_DEFAULT);
        $stmt = $pdo->prepare('INSERT INTO users (first_name, last_name, display_name, email, password, user_type, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([
            'Admin',
            'User',
            'Admin User',
            'admin@docavailable.com',
            $hashedPassword,
            'admin',
            'approved',
            date('Y-m-d H:i:s'),
            date('Y-m-d H:i:s')
        ]);
        
        echo "✅ Admin account created successfully!\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
} 