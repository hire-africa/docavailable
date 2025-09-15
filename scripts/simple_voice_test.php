<?php
/**
 * Simple voice message upload test script
 * This script tests the basic file upload functionality without Laravel dependencies
 */

echo "🎤 Simple Voice Message Upload Test\n";
echo "==================================\n\n";

// Test 1: Check if the upload directory exists
echo "Test 1: Checking upload directory\n";
$uploadDir = __DIR__ . '/../backend/storage/app/public/chat_voice_messages';
if (is_dir($uploadDir)) {
    echo "✅ Voice messages directory exists: $uploadDir\n";
    echo "   Writable: " . (is_writable($uploadDir) ? 'YES' : 'NO') . "\n";
} else {
    echo "⚠️ Voice messages directory doesn't exist: $uploadDir\n";
    echo "   Creating directory...\n";
    if (mkdir($uploadDir, 0755, true)) {
        echo "✅ Directory created successfully\n";
    } else {
        echo "❌ Failed to create directory\n";
    }
}

// Test 2: Check file permissions
echo "\nTest 2: Checking file permissions\n";
$testFile = $uploadDir . '/test_voice.m4a';
$testContent = 'test audio content';
if (file_put_contents($testFile, $testContent)) {
    echo "✅ Can write to voice messages directory\n";
    echo "   File size: " . filesize($testFile) . " bytes\n";
    unlink($testFile); // Clean up
} else {
    echo "❌ Cannot write to voice messages directory\n";
}

// Test 3: Check if the route file exists
echo "\nTest 3: Checking route configuration\n";
$routesFile = __DIR__ . '/../backend/routes/api.php';
if (file_exists($routesFile)) {
    echo "✅ Routes file exists\n";
    $routesContent = file_get_contents($routesFile);
    if (strpos($routesContent, 'upload/voice-message') !== false) {
        echo "✅ Voice upload route is defined\n";
    } else {
        echo "❌ Voice upload route not found in routes file\n";
    }
} else {
    echo "❌ Routes file not found\n";
}

// Test 4: Check if the controller exists
echo "\nTest 4: Checking controller\n";
$controllerFile = __DIR__ . '/../backend/app/Http/Controllers/FileUploadController.php';
if (file_exists($controllerFile)) {
    echo "✅ FileUploadController exists\n";
    $controllerContent = file_get_contents($controllerFile);
    if (strpos($controllerContent, 'uploadVoiceMessage') !== false) {
        echo "✅ uploadVoiceMessage method exists\n";
    } else {
        echo "❌ uploadVoiceMessage method not found\n";
    }
} else {
    echo "❌ FileUploadController not found\n";
}

// Test 5: Check validation rules
echo "\nTest 5: Checking validation rules\n";
if (isset($controllerContent)) {
    if (strpos($controllerContent, 'mimes:m4a,mp3,wav,aac,mp4') !== false) {
        echo "✅ MIME types validation includes mp4\n";
    } else {
        echo "❌ MIME types validation missing mp4\n";
    }
    
    if (strpos($controllerContent, 'max:10240') !== false) {
        echo "✅ File size limit is 10MB\n";
    } else {
        echo "❌ File size limit not found\n";
    }
}

// Test 6: Check recent logs for voice upload errors
echo "\nTest 6: Checking recent logs\n";
$logFile = __DIR__ . '/../backend/storage/logs/laravel.log';
if (file_exists($logFile)) {
    echo "✅ Log file exists\n";
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
        $recentLogs = array_slice($voiceLogs, -3);
        foreach ($recentLogs as $log) {
            echo "   " . substr($log, 0, 100) . "...\n";
        }
    } else {
        echo "ℹ️ No voice-related log entries found\n";
    }
} else {
    echo "⚠️ Log file not found\n";
}

echo "\n🎉 Simple voice upload test completed!\n";
echo "\nCommon causes of 422 errors:\n";
echo "1. File type not in allowed MIME types (m4a, mp3, wav, aac, mp4)\n";
echo "2. File size exceeds 10MB limit\n";
echo "3. Missing required fields (appointment_id)\n";
echo "4. Authentication issues\n";
echo "5. FormData format issues\n";
echo "\nTo test the actual upload:\n";
echo "1. Start your Laravel server\n";
echo "2. Use the app to record a voice message\n";
echo "3. Check the browser/device console for errors\n";
echo "4. Check the Laravel logs for validation errors\n"; 