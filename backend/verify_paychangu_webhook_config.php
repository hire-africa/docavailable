<?php

/**
 * Verify Paychangu Webhook Configuration
 * This script checks if all required configuration is in place for webhook compliance
 */

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== Paychangu Webhook Configuration Verification ===\n\n";

// Check environment variables
$requiredEnvVars = [
    'PAYCHANGU_PUBLIC_KEY' => 'Public key for Paychangu API',
    'PAYCHANGU_SECRET_KEY' => 'Secret key for Paychangu API',
    'PAYCHANGU_WEBHOOK_SECRET' => 'Webhook secret for signature verification',
    'PAYCHANGU_CALLBACK_URL' => 'Callback URL for payment notifications',
    'PAYCHANGU_RETURN_URL' => 'Return URL for payment redirects'
];

echo "1. Checking Environment Variables:\n";
$missingVars = [];
foreach ($requiredEnvVars as $var => $description) {
    $value = env($var);
    if (empty($value)) {
        echo "❌ $var: Missing ($description)\n";
        $missingVars[] = $var;
    } else {
        // Mask sensitive values
        $displayValue = $var === 'PAYCHANGU_WEBHOOK_SECRET' ? 
            substr($value, 0, 8) . '...' : 
            (strlen($value) > 20 ? substr($value, 0, 20) . '...' : $value);
        echo "✅ $var: Configured ($displayValue)\n";
    }
}

if (!empty($missingVars)) {
    echo "\n⚠️ Missing environment variables. Add these to your .env file:\n";
    foreach ($missingVars as $var) {
        echo "   $var=your_value_here\n";
    }
} else {
    echo "\n✅ All required environment variables are configured\n";
}

// Check webhook URL configuration
echo "\n2. Checking Webhook URL Configuration:\n";
$webhookUrl = 'https://docavailable-1.onrender.com/api/payments/webhook';
echo "Webhook URL: $webhookUrl\n";

// Test webhook endpoint accessibility
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $webhookUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_NOBODY, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($error) {
    echo "❌ Webhook endpoint test failed: $error\n";
} else {
    echo "✅ Webhook endpoint is accessible (HTTP $httpCode)\n";
    if ($httpCode === 405) {
        echo "   Note: 405 Method Not Allowed is expected for GET requests to POST endpoint\n";
    }
}

// Check database configuration
echo "\n3. Checking Database Configuration:\n";
try {
    $connection = config('database.default');
    $host = config("database.connections.$connection.host");
    $database = config("database.connections.$connection.database");
    
    echo "✅ Database connection configured\n";
    echo "   Connection: $connection\n";
    echo "   Host: $host\n";
    echo "   Database: $database\n";
    
    // Test database connection
    DB::connection()->getPdo();
    echo "✅ Database connection test successful\n";
    
} catch (Exception $e) {
    echo "❌ Database connection failed: " . $e->getMessage() . "\n";
}

// Check subscription table structure
echo "\n4. Checking Subscription Table Structure:\n";
try {
    $columns = DB::select("
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'subscriptions' 
        ORDER BY ordinal_position
    ");
    
    $requiredColumns = [
        'user_id', 'plan_id', 'status', 'start_date', 'end_date',
        'text_sessions_remaining', 'voice_calls_remaining', 'video_calls_remaining',
        'payment_metadata', 'payment_transaction_id', 'payment_gateway', 'payment_status'
    ];
    
    $existingColumns = array_column($columns, 'column_name');
    $missingColumns = array_diff($requiredColumns, $existingColumns);
    
    if (empty($missingColumns)) {
        echo "✅ All required subscription table columns exist\n";
    } else {
        echo "❌ Missing subscription table columns:\n";
        foreach ($missingColumns as $column) {
            echo "   - $column\n";
        }
    }
    
} catch (Exception $e) {
    echo "❌ Could not check subscription table: " . $e->getMessage() . "\n";
}

// Check Paychangu service configuration
echo "\n5. Checking Paychangu Service Configuration:\n";
$paychanguConfig = config('services.paychangu');
if ($paychanguConfig) {
    echo "✅ Paychangu service configuration loaded\n";
    echo "   Payment URL: " . ($paychanguConfig['payment_url'] ?? 'Not set') . "\n";
    echo "   Verify URL: " . ($paychanguConfig['verify_url'] ?? 'Not set') . "\n";
    echo "   Environment: " . ($paychanguConfig['environment'] ?? 'Not set') . "\n";
} else {
    echo "❌ Paychangu service configuration not found\n";
}

// Summary
echo "\n=== Configuration Summary ===\n";
if (empty($missingVars) && $httpCode !== 0) {
    echo "✅ Configuration appears to be complete and ready for webhook testing\n";
    echo "\nNext steps:\n";
    echo "1. Set webhook URL in Paychangu dashboard: $webhookUrl\n";
    echo "2. Run: php test_webhook_compliance.php\n";
    echo "3. Test with real Paychangu payments\n";
} else {
    echo "❌ Configuration needs attention before webhook testing\n";
    echo "\nPlease fix the issues above before proceeding\n";
}

echo "\n=== Verification Complete ===\n";
