<?php

require_once __DIR__ . '/../backend/vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "📋 CHECKING MESSAGE DETECTION LOGS\n";
echo "==================================\n\n";

// Get the Laravel log file path
$logPath = storage_path('logs/laravel.log');

if (!file_exists($logPath)) {
    echo "❌ Log file not found: {$logPath}\n";
    exit(1);
}

echo "✅ Found log file: {$logPath}\n\n";

// Read the last 1000 lines of the log file
$lines = file($logPath);
$recentLines = array_slice($lines, -1000);

echo "📊 Analyzing last 1000 log lines...\n\n";

// Search for message detection logs
$messageLogs = [];
$sessionLogs = [];
$errorLogs = [];

foreach ($recentLines as $line) {
    if (strpos($line, 'Text session message received') !== false) {
        $messageLogs[] = $line;
    }
    
    if (strpos($line, 'Patient message detected') !== false) {
        $messageLogs[] = $line;
    }
    
    if (strpos($line, '90-second timer started') !== false) {
        $messageLogs[] = $line;
    }
    
    if (strpos($line, 'Session status check requested') !== false) {
        $sessionLogs[] = $line;
    }
    
    if (strpos($line, 'Session expired') !== false) {
        $sessionLogs[] = $line;
    }
    
    if (strpos($line, 'ERROR') !== false || strpos($line, 'CRITICAL') !== false) {
        $errorLogs[] = $line;
    }
}

echo "🔍 MESSAGE DETECTION LOGS (" . count($messageLogs) . " entries):\n";
echo "==========================================\n";
if (empty($messageLogs)) {
    echo "❌ No message detection logs found\n";
} else {
    foreach (array_slice($messageLogs, -10) as $log) {
        echo trim($log) . "\n";
    }
}

echo "\n🔍 SESSION STATUS LOGS (" . count($sessionLogs) . " entries):\n";
echo "==========================================\n";
if (empty($sessionLogs)) {
    echo "❌ No session status logs found\n";
} else {
    foreach (array_slice($sessionLogs, -10) as $log) {
        echo trim($log) . "\n";
    }
}

echo "\n🔍 ERROR LOGS (" . count($errorLogs) . " entries):\n";
echo "==========================================\n";
if (empty($errorLogs)) {
    echo "✅ No error logs found\n";
} else {
    foreach (array_slice($errorLogs, -10) as $log) {
        echo trim($log) . "\n";
    }
}

echo "\n📊 SUMMARY:\n";
echo "===========\n";
echo "Message detection logs: " . count($messageLogs) . "\n";
echo "Session status logs: " . count($sessionLogs) . "\n";
echo "Error logs: " . count($errorLogs) . "\n";

if (empty($messageLogs)) {
    echo "\n⚠️  WARNING: No message detection logs found!\n";
    echo "   This could mean:\n";
    echo "   1. Messages are not reaching the backend\n";
    echo "   2. Text session detection is failing\n";
    echo "   3. Logging is not working properly\n";
}

if (empty($sessionLogs)) {
    echo "\n⚠️  WARNING: No session status check logs found!\n";
    echo "   This could mean:\n";
    echo "   1. Frontend is not polling session status\n";
    echo "   2. Session status checks are failing\n";
    echo "   3. API endpoints are not working\n";
}

echo "\n✅ Log analysis complete!\n";
