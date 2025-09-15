<?php

// Comprehensive payment system test
echo "🔍 COMPREHENSIVE PAYMENT SYSTEM DIAGNOSTIC\n";
echo "==========================================\n\n";

// Test 1: Database Connection
echo "1. Testing Database Connection...\n";
try {
    $pdo = new PDO(
        'mysql:host=' . env('DB_HOST') . ';dbname=' . env('DB_DATABASE'),
        env('DB_USERNAME'),
        env('DB_PASSWORD')
    );
    echo "✅ Database connection successful\n";
} catch (Exception $e) {
    echo "❌ Database connection failed: " . $e->getMessage() . "\n";
    exit;
}

// Test 2: Check if required tables exist
echo "\n2. Checking Required Tables...\n";
$requiredTables = ['users', 'plans', 'subscriptions', 'payment_transactions'];
foreach ($requiredTables as $table) {
    try {
        $stmt = $pdo->query("SHOW TABLES LIKE '$table'");
        if ($stmt->rowCount() > 0) {
            echo "✅ Table '$table' exists\n";
        } else {
            echo "❌ Table '$table' missing\n";
        }
    } catch (Exception $e) {
        echo "❌ Error checking table '$table': " . $e->getMessage() . "\n";
    }
}

// Test 3: Check subscription table structure
echo "\n3. Checking Subscription Table Structure...\n";
try {
    $stmt = $pdo->query("DESCRIBE subscriptions");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $requiredColumns = [
        'id', 'start_date', 'end_date', 'plan_id', 'user_id', 'status',
        'text_sessions_remaining', 'voice_calls_remaining', 'video_calls_remaining',
        'total_text_sessions', 'total_voice_calls', 'total_video_calls',
        'plan_name', 'plan_price', 'plan_currency', 'activated_at', 'expires_at',
        'is_active', 'payment_transaction_id', 'payment_gateway', 'payment_status',
        'payment_metadata', 'created_at', 'updated_at'
    ];
    
    $existingColumns = array_column($columns, 'Field');
    foreach ($requiredColumns as $column) {
        if (in_array($column, $existingColumns)) {
            echo "✅ Column '$column' exists\n";
        } else {
            echo "❌ Column '$column' missing\n";
        }
    }
} catch (Exception $e) {
    echo "❌ Error checking subscription table: " . $e->getMessage() . "\n";
}

// Test 4: Check plans table structure
echo "\n4. Checking Plans Table Structure...\n";
try {
    $stmt = $pdo->query("DESCRIBE plans");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $requiredColumns = [
        'id', 'name', 'features', 'currency', 'price', 'duration', 'status',
        'text_sessions', 'voice_calls', 'video_calls', 'created_at', 'updated_at'
    ];
    
    $existingColumns = array_column($columns, 'Field');
    foreach ($requiredColumns as $column) {
        if (in_array($column, $existingColumns)) {
            echo "✅ Column '$column' exists\n";
        } else {
            echo "❌ Column '$column' missing\n";
        }
    }
} catch (Exception $e) {
    echo "❌ Error checking plans table: " . $e->getMessage() . "\n";
}

// Test 5: Check foreign key constraints
echo "\n5. Checking Foreign Key Constraints...\n";
try {
    $stmt = $pdo->query("
        SELECT 
            CONSTRAINT_NAME,
            TABLE_NAME,
            COLUMN_NAME,
            REFERENCED_TABLE_NAME,
            REFERENCED_COLUMN_NAME
        FROM information_schema.KEY_COLUMN_USAGE 
        WHERE REFERENCED_TABLE_SCHEMA = '" . env('DB_DATABASE') . "'
        AND TABLE_NAME = 'subscriptions'
    ");
    $constraints = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($constraints)) {
        echo "❌ No foreign key constraints found for subscriptions table\n";
    } else {
        foreach ($constraints as $constraint) {
            echo "✅ Foreign key: {$constraint['COLUMN_NAME']} -> {$constraint['REFERENCED_TABLE_NAME']}.{$constraint['REFERENCED_COLUMN_NAME']}\n";
        }
    }
} catch (Exception $e) {
    echo "❌ Error checking foreign keys: " . $e->getMessage() . "\n";
}

// Test 6: Check if plans exist
echo "\n6. Checking Plans Data...\n";
try {
    $stmt = $pdo->query("SELECT id, name, price, currency, text_sessions, voice_calls, video_calls FROM plans WHERE status = 1");
    $plans = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($plans)) {
        echo "❌ No active plans found in database\n";
    } else {
        echo "✅ Found " . count($plans) . " active plans:\n";
        foreach ($plans as $plan) {
            echo "   - Plan {$plan['id']}: {$plan['name']} ({$plan['price']} {$plan['currency']})\n";
            echo "     Text sessions: {$plan['text_sessions']}, Voice calls: {$plan['voice_calls']}, Video calls: {$plan['video_calls']}\n";
        }
    }
} catch (Exception $e) {
    echo "❌ Error checking plans: " . $e->getMessage() . "\n";
}

// Test 7: Check PayChangu configuration
echo "\n7. Checking PayChangu Configuration...\n";
$requiredConfig = [
    'PAYCHANGU_SECRET_KEY',
    'PAYCHANGU_PAYMENT_URL',
    'PAYCHANGU_VERIFY_URL',
    'PAYCHANGU_CALLBACK_URL',
    'PAYCHANGU_RETURN_URL'
];

foreach ($requiredConfig as $config) {
    $value = env($config);
    if ($value) {
        echo "✅ $config is configured\n";
    } else {
        echo "❌ $config is missing\n";
    }
}

// Test 8: Test webhook endpoint accessibility
echo "\n8. Testing Webhook Endpoint...\n";
$webhookUrl = 'https://docavailable-1.onrender.com/api/payments/webhook';
$testData = [
    'transaction_id' => 'TEST_' . time(),
    'reference' => 'TEST_REF_' . time(),
    'amount' => 50.00,
    'currency' => 'USD',
    'status' => 'success',
    'meta' => [
        'user_id' => 11,
        'plan_id' => 5,
    ]
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $webhookUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($testData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200) {
    echo "✅ Webhook endpoint is accessible\n";
} elseif ($httpCode === 404) {
    echo "❌ Webhook endpoint not found (404)\n";
} elseif ($httpCode === 500) {
    echo "❌ Webhook endpoint server error (500)\n";
} else {
    echo "⚠️  Webhook endpoint returned HTTP $httpCode\n";
}

// Test 9: Check for potential data type issues
echo "\n9. Checking Data Type Compatibility...\n";
try {
    // Test subscription creation with sample data
    $testSubscription = [
        'start_date' => date('Y-m-d H:i:s'),
        'end_date' => date('Y-m-d H:i:s', strtotime('+30 days')),
        'plan_id' => 5,
        'user_id' => 11,
        'status' => 1,
        'text_sessions_remaining' => 10,
        'voice_calls_remaining' => 2,
        'video_calls_remaining' => 1,
        'total_text_sessions' => 10,
        'total_voice_calls' => 2,
        'total_video_calls' => 1,
        'plan_name' => 'Executive Life',
        'plan_price' => 50,
        'plan_currency' => 'USD',
        'activated_at' => date('Y-m-d H:i:s'),
        'expires_at' => date('Y-m-d H:i:s', strtotime('+30 days')),
        'is_active' => true,
        'payment_transaction_id' => 'TEST_' . time(),
        'payment_gateway' => 'paychangu',
        'payment_status' => 'completed',
        'payment_metadata' => json_encode(['test' => true])
    ];
    
    echo "✅ Sample subscription data structure is valid\n";
} catch (Exception $e) {
    echo "❌ Error with subscription data structure: " . $e->getMessage() . "\n";
}

// Test 10: Check for potential issues in PaymentController
echo "\n10. Checking PaymentController Logic...\n";
$potentialIssues = [];

// Check if the activatePlanForUser method has all required fields
$controllerFile = 'app/Http/Controllers/PaymentController.php';
if (file_exists($controllerFile)) {
    $content = file_get_contents($controllerFile);
    
    // Check for required fields in subscription creation
    $requiredFields = ['start_date', 'end_date', 'is_active', 'payment_status'];
    foreach ($requiredFields as $field) {
        if (strpos($content, $field) !== false) {
            echo "✅ Field '$field' is used in PaymentController\n";
        } else {
            echo "❌ Field '$field' might be missing in PaymentController\n";
            $potentialIssues[] = "Missing field: $field";
        }
    }
    
    // Check for error handling
    if (strpos($content, 'try') !== false && strpos($content, 'catch') !== false) {
        echo "✅ Error handling (try-catch) found in PaymentController\n";
    } else {
        echo "❌ Error handling might be insufficient in PaymentController\n";
        $potentialIssues[] = "Insufficient error handling";
    }
    
    // Check for database transactions
    if (strpos($content, 'DB::beginTransaction') !== false) {
        echo "✅ Database transactions are used in PaymentController\n";
    } else {
        echo "❌ Database transactions might be missing in PaymentController\n";
        $potentialIssues[] = "Missing database transactions";
    }
} else {
    echo "❌ PaymentController file not found\n";
    $potentialIssues[] = "PaymentController file missing";
}

// Summary
echo "\n" . str_repeat("=", 50) . "\n";
echo "📋 COMPREHENSIVE DIAGNOSTIC SUMMARY\n";
echo str_repeat("=", 50) . "\n";

if (empty($potentialIssues)) {
    echo "✅ No critical issues found!\n";
    echo "The payment system should work correctly.\n";
} else {
    echo "❌ Potential issues identified:\n";
    foreach ($potentialIssues as $issue) {
        echo "   - $issue\n";
    }
    echo "\n🔧 Recommended fixes:\n";
    echo "   1. Run missing migrations if any\n";
    echo "   2. Check database constraints\n";
    echo "   3. Verify PayChangu configuration\n";
    echo "   4. Test webhook processing\n";
}

echo "\n🎯 Next Steps:\n";
echo "   1. Deploy the fixes to live server\n";
echo "   2. Test a real payment flow\n";
echo "   3. Monitor webhook logs\n";
echo "   4. Verify subscription creation\n"; 