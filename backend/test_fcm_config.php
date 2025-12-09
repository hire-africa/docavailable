<?php

require_once __DIR__ . '/vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔧 Testing FCM V1 Configuration\n";
echo "===============================\n\n";

// Test 1: Check environment variables
echo "1️⃣ Environment Variables:\n";
echo "   FCM_PROJECT_ID: " . (env('FCM_PROJECT_ID') ?: '❌ NOT SET') . "\n";
echo "   FIREBASE_SERVICE_ACCOUNT_JSON: " . (env('FIREBASE_SERVICE_ACCOUNT_JSON') ? '✅ SET' : '❌ NOT SET') . "\n\n";

// Test 2: Check config values
echo "2️⃣ Config Values:\n";
echo "   services.fcm.project_id: " . (config('services.fcm.project_id') ?: '❌ NOT SET') . "\n";
echo "   services.fcm.service_account_json: " . (config('services.fcm.service_account_json') ? '✅ SET' : '❌ NOT SET') . "\n\n";

// Test 3: Test service account parsing
echo "3️⃣ Service Account Parsing:\n";
$serviceAccountJson = config('services.fcm.service_account_json');
if ($serviceAccountJson) {
    try {
        $serviceAccount = json_decode($serviceAccountJson, true);
        if ($serviceAccount && isset($serviceAccount['project_id'])) {
            echo "   ✅ Service account JSON is valid\n";
            echo "   Project ID: " . $serviceAccount['project_id'] . "\n";
            echo "   Client Email: " . $serviceAccount['client_email'] . "\n";
            echo "   Private Key: " . (isset($serviceAccount['private_key']) ? '✅ PRESENT' : '❌ MISSING') . "\n";
        } else {
            echo "   ❌ Service account JSON is invalid\n";
        }
    } catch (Exception $e) {
        echo "   ❌ Error parsing service account JSON: " . $e->getMessage() . "\n";
    }
} else {
    echo "   ❌ No service account JSON found\n";
}

echo "\n✅ Configuration test completed!\n";
