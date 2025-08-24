<?php

require_once 'vendor/autoload.php';

use App\Models\TextSession;
use App\Models\User;
use App\Services\DoctorPaymentService;

// Initialize Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔍 VERIFYING AUTO-DETECTION FIX WITH LIVE SESSIONS\n";
echo "==================================================\n\n";

try {
    // Get all active sessions
    $activeSessions = TextSession::where('status', TextSession::STATUS_ACTIVE)
        ->whereNotNull('activated_at')
        ->with(['patient', 'doctor'])
        ->get();
    
    if ($activeSessions->isEmpty()) {
        echo "❌ No active sessions found to test\n";
        echo "   Create a session first and activate it to test auto-detection\n";
        return;
    }
    
    echo "📋 Found {$activeSessions->count()} active session(s):\n\n";
    
    foreach ($activeSessions as $session) {
        echo "Session ID: {$session->id}\n";
        echo "Patient: {$session->patient->name} (ID: {$session->patient_id})\n";
        echo "Doctor: {$session->doctor->name} (ID: {$session->doctor_id})\n";
        echo "Status: {$session->status}\n";
        echo "Activated: {$session->activated_at}\n";
        echo "Elapsed minutes: {$session->getElapsedMinutes()}\n";
        echo "Sessions used: {$session->sessions_used}\n";
        echo "Auto deductions processed: {$session->auto_deductions_processed}\n";
        
        if ($session->patient && $session->patient->subscription) {
            echo "Sessions remaining: {$session->patient->subscription->text_sessions_remaining}\n";
        }
        
        echo "\n🧪 Testing auto-detection for this session...\n";
        
        // Test the checkResponse method
        $controller = new \App\Http\Controllers\TextSessionController();
        
        // Authenticate as the patient
        auth()->login($session->patient);
        
        // Get initial state
        $initialSessionsUsed = $session->sessions_used;
        $initialAutoDeductions = $session->auto_deductions_processed;
        $initialSessionsRemaining = $session->patient->subscription->text_sessions_remaining ?? 0;
        
        // Call checkResponse
        $response = $controller->checkResponse($session->id);
        $responseData = json_decode($response->getContent(), true);
        
        // Refresh session data
        $session->refresh();
        if ($session->patient && $session->patient->subscription) {
            $session->patient->subscription->refresh();
        }
        
        // Check results
        $newSessionsUsed = $session->sessions_used;
        $newAutoDeductions = $session->auto_deductions_processed;
        $newSessionsRemaining = $session->patient->subscription->text_sessions_remaining ?? 0;
        
        echo "   Response status: {$responseData['status']}\n";
        echo "   Response message: {$responseData['message']}\n";
        echo "   Sessions used: {$initialSessionsUsed} → {$newSessionsUsed}\n";
        echo "   Auto deductions: {$initialAutoDeductions} → {$newAutoDeductions}\n";
        echo "   Sessions remaining: {$initialSessionsRemaining} → {$newSessionsRemaining}\n";
        
        if ($newAutoDeductions > $initialAutoDeductions) {
            echo "   ✅ AUTO-DETECTION WORKING! New deductions processed\n";
        } else {
            echo "   ℹ️  No new deductions (expected if already processed)\n";
        }
        
        echo "\n" . str_repeat("-", 50) . "\n\n";
    }
    
    echo "🎉 Live session verification completed!\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
