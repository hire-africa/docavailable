<?php

require __DIR__.'/vendor/autoload.php';

// Load environment variables
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

echo "🔍 Testing Database Connection and Plan Existence...\n\n";

try {
    // Test database connection
    $dbUrl = $_ENV['DB_URL'];
    $dbConnection = new PDO($dbUrl);
    
    echo "✅ Database connection successful!\n";
    
    // Check if test plan exists
    $planId = 5; // Plan ID from webhook test data
    $stmt = $dbConnection->prepare("SELECT * FROM plans WHERE id = ?");
    $stmt->execute([$planId]);
    $plan = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($plan) {
        echo "✅ Test plan found:\n";
        print_r($plan);
    } else {
        echo "❌ Test plan (ID: {$planId}) not found!\n";
        echo "Creating test plan...\n";
        
        // Create test plan if it doesn't exist
        $stmt = $dbConnection->prepare("
            INSERT INTO plans (id, name, price, currency, duration, text_sessions, voice_calls, video_calls, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ");
        
        $stmt->execute([
            $planId,
            'Basic Life',
            100,
            'MWK',
            30, // 30 days duration
            10,  // text sessions
            5,   // voice calls
            2    // video calls
        ]);
        
        echo "✅ Test plan created successfully!\n";
    }
    
    // Check if test user exists
    $userId = 11; // User ID from webhook test data
    $stmt = $dbConnection->prepare("SELECT id, email FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($user) {
        echo "✅ Test user found:\n";
        print_r($user);
    } else {
        echo "❌ Test user (ID: {$userId}) not found!\n";
        echo "Please ensure test user exists before running webhook test.\n";
    }
    
} catch (PDOException $e) {
    echo "❌ Database connection failed!\n";
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
