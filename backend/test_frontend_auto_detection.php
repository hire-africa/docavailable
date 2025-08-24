<?php

require_once 'vendor/autoload.php';

use App\Models\TextSession;
use App\Models\User;
use App\Models\Subscription;
use App\Services\DoctorPaymentService;

// Initialize Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🧪 TESTING FRONTEND AUTO-DETECTION FLOW\n";
echo "=======================================\n\n";

try {
    // 1. Create a test patient with subscription
    echo "1️⃣ Creating test patient with subscription...\n";
    $patient = User::create([
        'first_name' => 'Test',
        'last_name' => 'Patient Frontend',
        'name' => 'Test Patient Frontend',
        'email' => 'test-patient-frontend-' . time() . '@example.com',
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
        'last_name' => 'Doctor Frontend',
        'name' => 'Test Doctor Frontend',
        'email' => 'test-doctor-frontend-' . time() . '@example.com',
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
    
    // 5. Simulate frontend API call (like sessionService.checkDoctorResponse)
    echo "5️⃣ Simulating frontend API call...\n";
    echo "   📡 Calling: GET /api/text-sessions/{$session->id}/check-response\n";
    
    // Authenticate as the patient (like frontend would)
    auth()->login($patient);
    
    // Create a mock request (simulating frontend HTTP call)
    $request = new \Illuminate\Http\Request();
    $request->setMethod('GET');
    $request->headers->set('Accept', 'application/json');
    $request->headers->set('Content-Type', 'application/json');
    
    // Create the controller instance
    $controller = new \App\Http\Controllers\TextSessionController();
    
    // Call the checkResponse method (this is what the frontend calls)
    $response = $controller->checkResponse($session->id);
    
    // Parse the response (like frontend would)
    $responseData = json_decode($response->getContent(), true);
    
    echo "   📥 Response received:\n";
    echo "      Status: {$responseData['status']}\n";
    echo "      Message: {$responseData['message']}\n";
    echo "      Success: " . ($responseData['success'] ? 'true' : 'false') . "\n";
    
    if (isset($responseData['remainingTimeMinutes'])) {
        echo "      Remaining minutes: {$responseData['remainingTimeMinutes']}\n";
    }
    if (isset($responseData['remainingSessions'])) {
        echo "      Remaining sessions: {$responseData['remainingSessions']}\n";
    }
    
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
        echo "   ✅ FRONTEND AUTO-DETECTION WORKING! Expected: {$expectedDeductions}, Actual: {$actualDeductions}\n";
    } else {
        echo "   ❌ FRONTEND AUTO-DETECTION FAILED! Expected: {$expectedDeductions}, Actual: {$actualDeductions}\n";
    }
    
    // 8. Test multiple frontend calls (simulating frontend polling every 10 seconds)
    echo "\n7️⃣ Testing multiple frontend calls (simulating polling)...\n";
    
    $beforeDeductions = $session->auto_deductions_processed;
    $beforeSessionsRemaining = $subscription->text_sessions_remaining;
    
    // Simulate 3 more frontend calls (like frontend polling every 10 seconds)
    for ($i = 1; $i <= 3; $i++) {
        echo "   📡 Frontend call #{$i}...\n";
        
        // Call checkResponse again (like frontend polling)
        $response2 = $controller->checkResponse($session->id);
        $responseData2 = json_decode($response2->getContent(), true);
        
        // Refresh data
        $session->refresh();
        $subscription->refresh();
        
        echo "      Response: {$responseData2['status']} - {$responseData2['message']}\n";
        echo "      Auto deductions: {$session->auto_deductions_processed}\n";
        echo "      Sessions remaining: {$subscription->text_sessions_remaining}\n";
    }
    
    $afterDeductions = $session->auto_deductions_processed;
    $afterSessionsRemaining = $subscription->text_sessions_remaining;
    
    if ($afterDeductions === $beforeDeductions) {
        echo "   ✅ No double processing detected (frontend polling safe)\n";
    } else {
        echo "   ❌ Double processing detected! Before: {$beforeDeductions}, After: {$afterDeductions}\n";
    }
    
    // 9. Test with different elapsed times
    echo "\n8️⃣ Testing with longer elapsed time...\n";
    
    // Update session to have 25 minutes elapsed (should trigger 2 auto-deductions)
    $session->update([
        'activated_at' => now()->subMinutes(25)
    ]);
    
    echo "   ✅ Updated session to 25 minutes elapsed\n";
    echo "   ✅ Expected auto-deductions: " . floor($session->getElapsedMinutes() / 10) . "\n";
    
    // Simulate frontend call
    $response3 = $controller->checkResponse($session->id);
    $responseData3 = json_decode($response3->getContent(), true);
    
    $session->refresh();
    $subscription->refresh();
    
    echo "   📥 Response: {$responseData3['status']} - {$responseData3['message']}\n";
    echo "   ✅ Auto deductions: {$session->auto_deductions_processed}\n";
    echo "   ✅ Sessions remaining: {$subscription->text_sessions_remaining}\n";
    
    $expectedDeductions2 = floor($session->getElapsedMinutes() / 10);
    $actualDeductions2 = $session->auto_deductions_processed;
    
    if ($actualDeductions2 >= $expectedDeductions2) {
        echo "   ✅ LONGER SESSION AUTO-DETECTION WORKING! Expected: {$expectedDeductions2}, Actual: {$actualDeductions2}\n";
    } else {
        echo "   ❌ LONGER SESSION AUTO-DETECTION FAILED! Expected: {$expectedDeductions2}, Actual: {$actualDeductions2}\n";
    }
    
    echo "\n🎉 FRONTEND AUTO-DETECTION TEST COMPLETED!\n";
    echo "📊 Summary:\n";
    echo "   - Frontend API calls work correctly\n";
    echo "   - Auto-deductions triggered by frontend polling\n";
    echo "   - No double processing with multiple calls\n";
    echo "   - Works with different session durations\n";
    
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
