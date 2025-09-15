<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔍 DEBUGGING SESSION 68\n";
echo "======================\n\n";

// Check if session 68 exists
echo "1. Checking if session 68 exists...\n";
try {
    $session = DB::table('text_sessions')->where('id', 68)->first();
    if ($session) {
        echo "✅ Session 68 EXISTS\n";
        echo "   Status: " . ($session->status ?? 'unknown') . "\n";
        echo "   Patient ID: " . ($session->patient_id ?? 'unknown') . "\n";
        echo "   Doctor ID: " . ($session->doctor_id ?? 'unknown') . "\n";
        echo "   Created: " . ($session->created_at ?? 'unknown') . "\n";
    } else {
        echo "❌ Session 68 NOT FOUND\n";
        exit(1);
    }
} catch (Exception $e) {
    echo "❌ Error checking session: " . $e->getMessage() . "\n";
    exit(1);
}

// Check if users exist
echo "\n2. Checking if users exist...\n";
try {
    $patient = DB::table('users')->where('id', $session->patient_id)->first();
    $doctor = DB::table('users')->where('id', $session->doctor_id)->first();
    
    if ($patient) {
        echo "✅ Patient exists: " . $patient->first_name . " " . $patient->last_name . "\n";
    } else {
        echo "❌ Patient not found\n";
    }
    
    if ($doctor) {
        echo "✅ Doctor exists: " . $doctor->first_name . " " . $doctor->last_name . "\n";
    } else {
        echo "❌ Doctor not found\n";
    }
} catch (Exception $e) {
    echo "❌ Error checking users: " . $e->getMessage() . "\n";
}

// Test the JOIN query that's used in ChatController
echo "\n3. Testing JOIN query...\n";
try {
    $textSession = DB::table('text_sessions')
        ->join('users as doctor', 'text_sessions.doctor_id', '=', 'doctor.id')
        ->join('users as patient', 'text_sessions.patient_id', '=', 'patient.id')
        ->where('text_sessions.id', 68)
        ->select(
            'text_sessions.*',
            'doctor.first_name as doctor_first_name',
            'doctor.last_name as doctor_last_name',
            'patient.first_name as patient_first_name',
            'patient.last_name as patient_last_name'
        )
        ->first();
        
    if ($textSession) {
        echo "✅ JOIN query successful\n";
        echo "   Doctor: " . $textSession->doctor_first_name . " " . $textSession->doctor_last_name . "\n";
        echo "   Patient: " . $textSession->patient_first_name . " " . $textSession->patient_last_name . "\n";
    } else {
        echo "❌ JOIN query failed - no results\n";
    }
} catch (Exception $e) {
    echo "❌ Error in JOIN query: " . $e->getMessage() . "\n";
    echo "   File: " . $e->getFile() . "\n";
    echo "   Line: " . $e->getLine() . "\n";
}

// Test MessageStorageService
echo "\n4. Testing MessageStorageService...\n";
try {
    $messageService = app(\App\Services\MessageStorageService::class);
    echo "✅ MessageStorageService instantiated\n";
    
    $messages = $messageService->getMessages(68);
    echo "✅ getMessages() successful - " . count($messages) . " messages\n";
    
    // Test storing a message
    $messageData = [
        'sender_id' => 15,
        'sender_name' => 'Test User',
        'message' => 'Test message',
        'message_type' => 'text',
        'temp_id' => 'test_' . time()
    ];
    
    $message = $messageService->storeMessage(68, $messageData);
    echo "✅ storeMessage() successful\n";
    echo "   Message ID: " . ($message['id'] ?? 'unknown') . "\n";
    
} catch (Exception $e) {
    echo "❌ Error in MessageStorageService: " . $e->getMessage() . "\n";
    echo "   File: " . $e->getFile() . "\n";
    echo "   Line: " . $e->getLine() . "\n";
}

echo "\n=== DEBUG COMPLETE ===\n";
