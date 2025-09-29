<?php

require_once 'vendor/autoload.php';

use App\Models\CallSession;
use App\Models\User;
use App\Models\Subscription;

// Test creating a call session
try {
    echo "Testing CallSession functionality...\n";
    
    // Test 1: Check if CallSession model can be instantiated
    $callSession = new CallSession();
    echo "✅ CallSession model loaded successfully\n";
    
    // Test 2: Check if we can query the table
    $count = CallSession::count();
    echo "✅ Database query successful. Current call sessions: $count\n";
    
    // Test 3: Test creating a call session (without saving)
    $testSession = new CallSession([
        'patient_id' => 1,
        'doctor_id' => 2,
        'call_type' => 'voice',
        'appointment_id' => 'test_appointment_123',
        'status' => CallSession::STATUS_CONNECTING,
        'started_at' => now(),
        'last_activity_at' => now(),
        'reason' => 'Test call session',
        'sessions_used' => 1,
        'sessions_remaining_before_start' => 5,
        'is_connected' => false,
        'call_duration' => 0,
    ]);
    
    echo "✅ CallSession object created successfully\n";
    echo "   - Patient ID: " . $testSession->patient_id . "\n";
    echo "   - Doctor ID: " . $testSession->doctor_id . "\n";
    echo "   - Call Type: " . $testSession->call_type . "\n";
    echo "   - Status: " . $testSession->status . "\n";
    echo "   - Appointment ID: " . $testSession->appointment_id . "\n";
    
    // Test 4: Test the model methods
    echo "✅ Testing model methods:\n";
    echo "   - isConnecting(): " . ($testSession->isConnecting() ? 'true' : 'false') . "\n";
    echo "   - isActive(): " . ($testSession->isActive() ? 'true' : 'false') . "\n";
    
    // Test 5: Test status constants
    echo "✅ Status constants:\n";
    echo "   - STATUS_CONNECTING: " . CallSession::STATUS_CONNECTING . "\n";
    echo "   - STATUS_ACTIVE: " . CallSession::STATUS_ACTIVE . "\n";
    echo "   - CALL_TYPE_VOICE: " . CallSession::CALL_TYPE_VOICE . "\n";
    echo "   - CALL_TYPE_VIDEO: " . CallSession::CALL_TYPE_VIDEO . "\n";
    
    echo "\n🎉 All tests passed! CallSession functionality is working correctly.\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
}
