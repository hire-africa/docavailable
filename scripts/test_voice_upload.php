<?php

/**
 * Test script to verify voice message upload endpoint
 * Run this script to test the voice message upload functionality
 */

require_once __DIR__ . '/../backend/vendor/autoload.php';

// Initialize Laravel
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🎤 Testing Voice Message Upload Endpoint\n";
echo "========================================\n\n";

// Test 1: Check if the upload endpoint exists
echo "Test 1: Checking upload endpoint\n";
$routes = \Illuminate\Support\Facades\Route::getRoutes();
$uploadRoute = null;

foreach ($routes as $route) {
    if (strpos($route->uri(), 'upload/voice-message') !== false) {
        $uploadRoute = $route;
        break;
    }
}

if ($uploadRoute) {
    echo "✅ Voice message upload endpoint found: " . $uploadRoute->uri() . "\n";
    echo "   Methods: " . implode(', ', $uploadRoute->methods()) . "\n";
} else {
    echo "❌ Voice message upload endpoint not found\n";
}

// Test 2: Check FileUploadController
echo "\nTest 2: Checking FileUploadController\n";
$controllerPath = __DIR__ . '/../backend/app/Http/Controllers/FileUploadController.php';
if (file_exists($controllerPath)) {
    echo "✅ FileUploadController exists\n";
    
    $content = file_get_contents($controllerPath);
    if (strpos($content, 'uploadVoiceMessage') !== false) {
        echo "✅ uploadVoiceMessage method exists\n";
    } else {
        echo "❌ uploadVoiceMessage method not found\n";
    }
} else {
    echo "❌ FileUploadController not found\n";
}

// Test 3: Check storage configuration
echo "\nTest 3: Checking storage configuration\n";
$storagePath = storage_path('app/public/chat_voice_messages');
if (is_dir($storagePath)) {
    echo "✅ Voice message storage directory exists\n";
} else {
    echo "⚠️ Voice message storage directory doesn't exist (will be created automatically)\n";
}

// Test 4: Check if storage is linked
echo "\nTest 4: Checking storage link\n";
$publicPath = public_path('storage');
if (is_link($publicPath)) {
    echo "✅ Storage is linked to public directory\n";
} else {
    echo "⚠️ Storage is not linked to public directory\n";
    echo "   Run: php artisan storage:link\n";
}

echo "\n🎉 Voice message upload endpoint test completed!\n";
echo "The endpoint should be accessible at: /api/upload/voice-message\n"; 