<?php
/**
 * Debug script to test voice message upload functionality
 * This script will help identify the cause of the 422 error
 */

require_once __DIR__ . '/../backend/vendor/autoload.php';

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

echo "🎤 Debugging Voice Message Upload\n";
echo "================================\n\n";

// Test 1: Check if the route exists
echo "Test 1: Checking route existence\n";
$routes = Route::getRoutes();
$voiceUploadRoute = null;

foreach ($routes as $route) {
    if (strpos($route->uri(), 'upload/voice-message') !== false) {
        $voiceUploadRoute = $route;
        break;
    }
}

if ($voiceUploadRoute) {
    echo "✅ Voice upload route found: " . $voiceUploadRoute->uri() . "\n";
    echo "   Methods: " . implode(', ', $voiceUploadRoute->methods()) . "\n";
} else {
    echo "❌ Voice upload route not found\n";
}

// Test 2: Check middleware
echo "\nTest 2: Checking middleware\n";
if ($voiceUploadRoute) {
    $middleware = $voiceUploadRoute->middleware();
    echo "✅ Middleware: " . implode(', ', $middleware) . "\n";
}

// Test 3: Check storage configuration
echo "\nTest 3: Checking storage configuration\n";
try {
    $disk = Storage::disk('public');
    $path = $disk->path('test');
    echo "✅ Public storage disk is accessible\n";
    echo "   Path: " . $path . "\n";
} catch (Exception $e) {
    echo "❌ Storage disk error: " . $e->getMessage() . "\n";
}

// Test 4: Check directory permissions
echo "\nTest 4: Checking directory permissions\n";
$storagePath = storage_path('app/public/chat_voice_messages');
if (is_dir($storagePath)) {
    echo "✅ Voice messages directory exists\n";
    echo "   Writable: " . (is_writable($storagePath) ? 'YES' : 'NO') . "\n";
} else {
    echo "⚠️ Voice messages directory doesn't exist (will be created automatically)\n";
}

// Test 5: Check validation rules
echo "\nTest 5: Checking validation rules\n";
$allowedMimes = ['m4a', 'mp3', 'wav', 'aac', 'mp4'];
echo "✅ Allowed MIME types: " . implode(', ', $allowedMimes) . "\n";
echo "✅ Max file size: 10MB\n";

// Test 6: Simulate file upload
echo "\nTest 6: Simulating file upload\n";
try {
    // Create a test file
    $testFile = tempnam(sys_get_temp_dir(), 'voice_test');
    file_put_contents($testFile, 'test audio content');
    
    // Create a mock request
    $request = new Request();
    $request->files->set('file', new \Illuminate\Http\UploadedFile(
        $testFile,
        'test_voice.m4a',
        'audio/mp4',
        null,
        true
    ));
    $request->merge(['appointment_id' => 1]);
    
    echo "✅ Test request created successfully\n";
    echo "   File: " . basename($testFile) . "\n";
    echo "   Size: " . filesize($testFile) . " bytes\n";
    
    // Clean up
    unlink($testFile);
} catch (Exception $e) {
    echo "❌ Test request creation failed: " . $e->getMessage() . "\n";
}

// Test 7: Check recent logs
echo "\nTest 7: Checking recent logs for voice upload errors\n";
$logFile = storage_path('logs/laravel.log');
if (file_exists($logFile)) {
    $logContent = file_get_contents($logFile);
    $voiceLogs = [];
    
    $lines = explode("\n", $logContent);
    foreach ($lines as $line) {
        if (strpos($line, 'voice') !== false || strpos($line, 'Voice') !== false) {
            $voiceLogs[] = $line;
        }
    }
    
    if (!empty($voiceLogs)) {
        echo "✅ Found " . count($voiceLogs) . " voice-related log entries\n";
        echo "Recent entries:\n";
        $recentLogs = array_slice($voiceLogs, -5);
        foreach ($recentLogs as $log) {
            echo "   " . substr($log, 0, 100) . "...\n";
        }
    } else {
        echo "ℹ️ No voice-related log entries found\n";
    }
} else {
    echo "⚠️ Log file not found\n";
}

echo "\n🎉 Voice upload debugging completed!\n";
echo "\nCommon causes of 422 errors:\n";
echo "1. File type not in allowed MIME types\n";
echo "2. File size exceeds limit\n";
echo "3. Missing required fields (appointment_id)\n";
echo "4. Authentication issues\n";
echo "5. FormData format issues\n"; 