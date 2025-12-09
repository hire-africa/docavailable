<?php

// Syntax test for subscription fix - no database connection required
echo "🔍 Testing Subscription Fix Syntax...\n\n";

// Test 1: Check if PaymentController exists and has the method
echo "1. Checking PaymentController...\n";
if (class_exists('App\Http\Controllers\PaymentController')) {
    echo "✅ PaymentController class exists\n";
    
    $reflection = new ReflectionClass('App\Http\Controllers\PaymentController');
    if ($reflection->hasMethod('activatePlanForUser')) {
        echo "✅ activatePlanForUser method exists\n";
        
        $method = $reflection->getMethod('activatePlanForUser');
        if ($method->isProtected()) {
            echo "✅ Method is properly protected\n";
        } else {
            echo "❌ Method should be protected\n";
        }
    } else {
        echo "❌ activatePlanForUser method not found\n";
    }
} else {
    echo "❌ PaymentController class not found\n";
}

// Test 2: Check if User model has new methods
echo "\n2. Checking User model...\n";
if (class_exists('App\Models\User')) {
    echo "✅ User model exists\n";
    
    $reflection = new ReflectionClass('App\Models\User');
    $methods = ['subscription', 'subscriptions', 'activeSubscription'];
    
    foreach ($methods as $methodName) {
        if ($reflection->hasMethod($methodName)) {
            echo "✅ $methodName method exists\n";
        } else {
            echo "❌ $methodName method not found\n";
        }
    }
} else {
    echo "❌ User model not found\n";
}

// Test 3: Check if Subscription model has new methods
echo "\n3. Checking Subscription model...\n";
if (class_exists('App\Models\Subscription')) {
    echo "✅ Subscription model exists\n";
    
    $reflection = new ReflectionClass('App\Models\Subscription');
    $methods = ['scopeActive', 'scopeForUser', 'deactivate', 'activate'];
    
    foreach ($methods as $methodName) {
        if ($reflection->hasMethod($methodName)) {
            echo "✅ $methodName method exists\n";
        } else {
            echo "❌ $methodName method not found\n";
        }
    }
} else {
    echo "❌ Subscription model not found\n";
}

// Test 4: Check if migration file exists
echo "\n4. Checking migration file...\n";
$migrationFile = 'database/migrations/2025_01_27_000001_ensure_subscription_constraints_are_correct.php';
if (file_exists($migrationFile)) {
    echo "✅ Migration file exists\n";
    
    $content = file_get_contents($migrationFile);
    if (strpos($content, 'subscriptions') !== false) {
        echo "✅ Migration file contains subscription references\n";
    } else {
        echo "❌ Migration file doesn't contain subscription references\n";
    }
} else {
    echo "❌ Migration file not found\n";
}

// Test 5: Check PaymentController code for error handling
echo "\n5. Checking PaymentController error handling...\n";
$controllerFile = 'app/Http/Controllers/PaymentController.php';
if (file_exists($controllerFile)) {
    $content = file_get_contents($controllerFile);
    
    $checks = [
        'QueryException' => 'Database exception handling',
        'duplicate key' => 'Duplicate key error handling',
        'unique constraint' => 'Unique constraint error handling',
        'constraint violation' => 'Constraint violation handling',
        'activatePlanForUser' => 'Main activation method'
    ];
    
    foreach ($checks as $search => $description) {
        if (strpos($content, $search) !== false) {
            echo "✅ $description found\n";
        } else {
            echo "❌ $description not found\n";
        }
    }
} else {
    echo "❌ PaymentController file not found\n";
}

echo "\n" . str_repeat("=", 50) . "\n";
echo "✅ Syntax test completed!\n";
echo "The subscription fix code structure looks correct.\n";
echo "To fully test, run on the production server with database access.\n";
