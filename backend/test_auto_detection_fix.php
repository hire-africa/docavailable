<?php

require_once 'vendor/autoload.php';

use App\Models\TextSession;
use App\Models\User;
use App\Models\Subscription;
use App\Services\DoctorPaymentService;

// Initialize Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🧪 TESTING AUTO-DETECTION FIX\n";
echo "==============================\n\n";

try {
    // 1. Create a test patient with subscription
    echo "1️⃣ Creating test patient with subscription...\n";
    $patient = User::create([
        'first_name' => 'Test',
        'last_name' => 'Patient Auto-Detection',
        'name' => 'Test Patient Auto-Detection',
        'email' => 'test-patient-auto-detection-' . time() . '@example.com',
        'password' => bcrypt('password'),
        'user_type' => 'patient',
        'status' => 'active'
    ]);
    
    $subscription = Subscription::create([
        'user_id' => $patient->id,
        'plan_type' => 'basic',
        'text_sessions_remaining' => 10,
        'voice_sessions_remaining' => 5,
        'video_sessions_remaining' => 2,
        'is_active' => true,
        'activated_at' => now(),
        'expires_at' => now()->addDays(30)
    ]);
    
    echo "   ✅ Patient created with ID: {$patient->id}\n";
    echo "   ✅ Subscription created with {$subscription->text_sessions_remaining} sessions\n\n";
    
    // 2. Create a test doctor
    echo "2️⃣ Creating test doctor...\n";
    $doctor = User::create([
        'first_name' => 'Test',
        'last_name' => 'Doctor Auto-Detection',
        'name' => 'Test Doctor Auto-Detection',
        'email' => 'test-doctor-auto-detection-' . time() . '@example.com',
        'password' => bcrypt('password'),
        'user_type' => 'doctor',
        'status' => 'approved'
    ]);
    
    echo "   ✅ Doctor created with ID: {$doctor->id}\n\n";
    
    // 3. Create a text session
    echo "3️⃣ Creating text session...\n";
    $session = TextSession::create([
        'patient_id' => $patient->id,
        'doctor_id' => $doctor->id,
        'status' => TextSession::STATUS_WAITING_FOR_DOCTOR,
        'started_at' => now(),
        'last_activity_at' => now(),
        'sessions_remaining_before_start' => $subscription->text_sessions_remaining
    ]);
    
    echo "   ✅ Session created with ID: {$session->id}\n";
    echo "   ✅ Status: {$session->status}\n\n";
    
    // 4. Activate the session (simulate doctor sending first message)
    echo "4️⃣ Activating session...\n";
    $session->update([
        'status' => TextSession::STATUS_ACTIVE,
        'activated_at' => now()->subMinutes(15) // 15 minutes ago to trigger auto-deduction
    ]);
    
    echo "   ✅ Session activated\n";
    echo "   ✅ Activated at: {$session->activated_at}\n";
    echo "   ✅ Elapsed minutes: {$session->getElapsedMinutes()}\n";
    echo "   ✅ Expected auto-deductions: " . floor($session->getElapsedMinutes() / 10) . "\n\n";
    
    // 5. Test the checkResponse endpoint (this should trigger auto-deduction)
    echo "5️⃣ Testing checkResponse endpoint...\n";
    
    // Simulate the controller method
    $controller = new \App\Http\Controllers\TextSessionController();
    
    // We need to authenticate as the patient
    auth()->login($patient);
    
    // Call the checkResponse method
    $response = $controller->checkResponse($session->id);
    $responseData = json_decode($response->getContent(), true);
    
    echo "   ✅ Response status: {$responseData['status']}\n";
    echo "   ✅ Response message: {$responseData['message']}\n";
    
    // 6. Check if auto-deduction was processed
    echo "\n6️⃣ Checking auto-deduction results...\n";
    
    // Refresh the session from database
    $session->refresh();
    $subscription->refresh();
    
    echo "   ✅ Sessions used: {$session->sessions_used}\n";
    echo "   ✅ Auto deductions processed: {$session->auto_deductions_processed}\n";
    echo "   ✅ Sessions remaining: {$subscription->text_sessions_remaining}\n";
    
    // 7. Verify the results
    $expectedDeductions = floor($session->getElapsedMinutes() / 10);
    $actualDeductions = $session->auto_deductions_processed;
    
    if ($actualDeductions >= $expectedDeductions) {
        echo "   ✅ AUTO-DETECTION FIX WORKING! Expected: {$expectedDeductions}, Actual: {$actualDeductions}\n";
    } else {
        echo "   ❌ AUTO-DETECTION FIX FAILED! Expected: {$expectedDeductions}, Actual: {$actualDeductions}\n";
    }
    
    // 8. Test multiple calls to ensure no double processing
    echo "\n7️⃣ Testing multiple calls (should not double-process)...\n";
    
    $beforeDeductions = $session->auto_deductions_processed;
    
    // Call checkResponse again
    $response2 = $controller->checkResponse($session->id);
    $session->refresh();
    
    $afterDeductions = $session->auto_deductions_processed;
    
    if ($afterDeductions === $beforeDeductions) {
        echo "   ✅ No double processing detected\n";
    } else {
        echo "   ❌ Double processing detected! Before: {$beforeDeductions}, After: {$afterDeductions}\n";
    }
    
    echo "\n🎉 AUTO-DETECTION FIX TEST COMPLETED!\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
} finally {
    // Clean up test data
    if (isset($session)) {
        $session->delete();
    }
    if (isset($subscription)) {
        $subscription->delete();
    }
    if (isset($patient)) {
        $patient->delete();
    }
    if (isset($doctor)) {
        $doctor->delete();
    }
    echo "\n🧹 Test data cleaned up\n";
}
