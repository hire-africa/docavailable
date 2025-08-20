<?php

require_once __DIR__ . '/../backend/vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\TextSession;
use App\Models\User;

echo "🔍 CHECKING SESSION 72 STATUS\n";
echo "=============================\n\n";

// Check if session 72 exists
$session = TextSession::find(72);

if (!$session) {
    echo "❌ Session 72 does not exist!\n";
    exit(1);
}

echo "✅ Session 72 found:\n";
echo "  ID: {$session->id}\n";
echo "  Status: {$session->status}\n";
echo "  Patient ID: {$session->patient_id}\n";
echo "  Doctor ID: {$session->doctor_id}\n";
echo "  Started At: {$session->started_at}\n";
echo "  Last Activity: {$session->last_activity_at}\n";
echo "  Doctor Response Deadline: " . ($session->doctor_response_deadline ? $session->doctor_response_deadline : 'NOT SET') . "\n";
echo "  Activated At: " . ($session->activated_at ? $session->activated_at : 'NOT SET') . "\n";
echo "  Ended At: " . ($session->ended_at ? $session->ended_at : 'NOT SET') . "\n\n";

// Check if the users exist
$patient = User::find($session->patient_id);
$doctor = User::find($session->doctor_id);

echo "👥 User Information:\n";
echo "  Patient: " . ($patient ? "{$patient->first_name} {$patient->last_name} (ID: {$patient->id})" : "NOT FOUND") . "\n";
echo "  Doctor: " . ($doctor ? "{$doctor->first_name} {$doctor->last_name} (ID: {$doctor->id})" : "NOT FOUND") . "\n\n";

// Check recent messages for this session
echo "📝 Recent Messages for Session 72:\n";
echo "==================================\n";

// Check cache for messages
$cacheKey = "chat_messages_72";
$cachedMessages = \Cache::get($cacheKey);

if ($cachedMessages) {
    echo "✅ Found cached messages:\n";
    $messages = $cachedMessages['messages'] ?? [];
    echo "  Total messages: " . count($messages) . "\n";
    
    foreach (array_slice($messages, -5) as $message) {
        echo "  - {$message['sender_name']}: {$message['message']} ({$message['created_at']})\n";
    }
} else {
    echo "❌ No cached messages found for session 72\n";
}

echo "\n🔍 Testing session status check:\n";
echo "================================\n";

// Test the session status check
$controller = new \App\Http\Controllers\TextSessionController();
$response = $controller->checkResponse(72);
$responseData = json_decode($response->getContent(), true);

echo "✅ Session Status Check Result:\n";
echo "  Status: {$responseData['status']}\n";
echo "  Time Remaining: " . ($responseData['timeRemaining'] ?? 'null') . "\n";
echo "  Message: {$responseData['message']}\n";
echo "  Remaining Time Minutes: " . ($responseData['remainingTimeMinutes'] ?? 'null') . "\n";
echo "  Remaining Sessions: " . ($responseData['remainingSessions'] ?? 'null') . "\n\n";

echo "🎯 Analysis:\n";
echo "============\n";

if ($session->status === 'waiting_for_doctor' && !$session->doctor_response_deadline) {
    echo "✅ Session is in 'waiting_for_doctor' status with no deadline set\n";
    echo "   This means no patient messages have been detected yet\n";
    echo "   The 90-second timer has not been started\n\n";
    
    if ($cachedMessages && count($cachedMessages['messages'] ?? []) > 0) {
        echo "⚠️  BUT there are cached messages! This suggests:\n";
        echo "   1. Messages are being stored in cache but not reaching the text session logic\n";
        echo "   2. The frontend might be sending to the wrong endpoint\n";
        echo "   3. There might be a routing issue\n\n";
    } else {
        echo "✅ No cached messages found, which explains why no deadline is set\n";
        echo "   The patient hasn't sent any messages yet\n\n";
    }
} elseif ($session->status === 'waiting_for_doctor' && $session->doctor_response_deadline) {
    echo "✅ Session is in 'waiting_for_doctor' status with deadline set\n";
    echo "   Patient message was detected and 90-second timer is running\n";
    echo "   Deadline: {$session->doctor_response_deadline}\n";
    echo "   Time remaining: " . max(0, $session->doctor_response_deadline->diffInSeconds(now())) . " seconds\n\n";
} elseif ($session->status === 'active') {
    echo "✅ Session is active\n";
    echo "   Doctor has responded and session is running\n\n";
} else {
    echo "ℹ️  Session status: {$session->status}\n\n";
}

echo "✅ Session 72 analysis complete!\n";

