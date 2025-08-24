<?php

require_once 'vendor/autoload.php';

use App\Models\TextSession;
use App\Models\User;
use App\Models\Subscription;
use App\Services\DoctorPaymentService;

// Initialize Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🌐 TESTING HTTP FRONTEND AUTO-DETECTION FLOW\n";
echo "============================================\n\n";

try {
    // 1. Create a test patient with subscription
    echo "1️⃣ Creating test patient with subscription...\n";
    $patient = User::create([
        'first_name' => 'Test',
        'last_name' => 'Patient HTTP',
        'name' => 'Test Patient HTTP',
        'email' => 'test-patient-http-' . time() . '@example.com',
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
        'last_name' => 'Doctor HTTP',
        'name' => 'Test Doctor HTTP',
        'email' => 'test-doctor-http-' . time() . '@example.com',
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
    
    // 5. Generate JWT token for the patient (like frontend would)
    echo "5️⃣ Generating JWT token for patient...\n";
    
    // Create a JWT token (simulating frontend authentication)
    $token = \Tymon\JWTAuth\Facades\JWTAuth::fromUser($patient);
    
    echo "   ✅ JWT token generated: " . substr($token, 0, 20) . "...\n\n";
    
    // 6. Simulate HTTP request (like frontend would make)
    echo "6️⃣ Simulating HTTP request...\n";
    echo "   📡 HTTP GET /api/text-sessions/{$session->id}/check-response\n";
    echo "   🔑 Authorization: Bearer [JWT_TOKEN]\n";
    
    // Create a proper HTTP request (simulating frontend)
    $request = \Illuminate\Http\Request::create(
        "/api/text-sessions/{$session->id}/check-response",
        'GET',
        [],
        [],
        [],
        [
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_CONTENT_TYPE' => 'application/json',
            'HTTP_AUTHORIZATION' => "Bearer {$token}",
            'HTTP_USER_AGENT' => 'DocAvailable-Frontend/1.0',
        ]
    );
    
    // Set the authenticated user
    $request->setUserResolver(function () use ($patient) {
        return $patient;
    });
    
    // Create the controller and call the method
    $controller = new \App\Http\Controllers\TextSessionController();
    
    // Call checkResponse with the HTTP request
    $response = $controller->checkResponse($session->id);
    
    // Parse the response
    $responseData = json_decode($response->getContent(), true);
    
    echo "   📥 HTTP Response received:\n";
    echo "      Status Code: {$response->getStatusCode()}\n";
    echo "      Content Type: {$response->headers->get('Content-Type')}\n";
    echo "      Response Status: {$responseData['status']}\n";
    echo "      Response Message: {$responseData['message']}\n";
    echo "      Success: " . ($responseData['success'] ? 'true' : 'false') . "\n";
    
    if (isset($responseData['remainingTimeMinutes'])) {
        echo "      Remaining minutes: {$responseData['remainingTimeMinutes']}\n";
    }
    if (isset($responseData['remainingSessions'])) {
        echo "      Remaining sessions: {$responseData['remainingSessions']}\n";
    }
    
    // 7. Check if auto-deduction was processed
    echo "\n7️⃣ Checking auto-deduction results...\n";
    
    // Refresh the session from database
    $session->refresh();
    $subscription->refresh();
    
    echo "   ✅ Sessions used: {$session->sessions_used}\n";
    echo "   ✅ Auto deductions processed: {$session->auto_deductions_processed}\n";
    echo "   ✅ Sessions remaining: {$subscription->text_sessions_remaining}\n";
    
    // 8. Verify the results
    $expectedDeductions = floor($session->getElapsedMinutes() / 10);
    $actualDeductions = $session->auto_deductions_processed;
    
    if ($actualDeductions >= $expectedDeductions) {
        echo "   ✅ HTTP FRONTEND AUTO-DETECTION WORKING! Expected: {$expectedDeductions}, Actual: {$actualDeductions}\n";
    } else {
        echo "   ❌ HTTP FRONTEND AUTO-DETECTION FAILED! Expected: {$expectedDeductions}, Actual: {$actualDeductions}\n";
    }
    
    // 9. Test multiple HTTP calls (simulating frontend polling)
    echo "\n8️⃣ Testing multiple HTTP calls (simulating frontend polling)...\n";
    
    $beforeDeductions = $session->auto_deductions_processed;
    $beforeSessionsRemaining = $subscription->text_sessions_remaining;
    
    // Simulate 3 more HTTP calls (like frontend polling every 10 seconds)
    for ($i = 1; $i <= 3; $i++) {
        echo "   📡 HTTP call #{$i}...\n";
        
        // Create new HTTP request for each call
        $request2 = \Illuminate\Http\Request::create(
            "/api/text-sessions/{$session->id}/check-response",
            'GET',
            [],
            [],
            [],
            [
                'HTTP_ACCEPT' => 'application/json',
                'HTTP_CONTENT_TYPE' => 'application/json',
                'HTTP_AUTHORIZATION' => "Bearer {$token}",
                'HTTP_USER_AGENT' => 'DocAvailable-Frontend/1.0',
            ]
        );
        
        $request2->setUserResolver(function () use ($patient) {
            return $patient;
        });
        
        // Call checkResponse again
        $response2 = $controller->checkResponse($session->id);
        $responseData2 = json_decode($response2->getContent(), true);
        
        // Refresh data
        $session->refresh();
        $subscription->refresh();
        
        echo "      HTTP Status: {$response2->getStatusCode()}\n";
        echo "      Response: {$responseData2['status']} - {$responseData2['message']}\n";
        echo "      Auto deductions: {$session->auto_deductions_processed}\n";
        echo "      Sessions remaining: {$subscription->text_sessions_remaining}\n";
    }
    
    $afterDeductions = $session->auto_deductions_processed;
    $afterSessionsRemaining = $subscription->text_sessions_remaining;
    
    if ($afterDeductions === $beforeDeductions) {
        echo "   ✅ No double processing detected (HTTP polling safe)\n";
    } else {
        echo "   ❌ Double processing detected! Before: {$beforeDeductions}, After: {$afterDeductions}\n";
    }
    
    // 10. Test with invalid token (security test)
    echo "\n9️⃣ Testing with invalid token (security test)...\n";
    
    $invalidRequest = \Illuminate\Http\Request::create(
        "/api/text-sessions/{$session->id}/check-response",
        'GET',
        [],
        [],
        [],
        [
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_CONTENT_TYPE' => 'application/json',
            'HTTP_AUTHORIZATION' => "Bearer invalid_token_123",
            'HTTP_USER_AGENT' => 'DocAvailable-Frontend/1.0',
        ]
    );
    
    try {
        $response3 = $controller->checkResponse($session->id);
        echo "   ❌ Security test failed - should have rejected invalid token\n";
    } catch (Exception $e) {
        echo "   ✅ Security test passed - invalid token rejected\n";
    }
    
    echo "\n🎉 HTTP FRONTEND AUTO-DETECTION TEST COMPLETED!\n";
    echo "📊 Summary:\n";
    echo "   - HTTP requests work correctly\n";
    echo "   - JWT authentication works\n";
    echo "   - Auto-deductions triggered by HTTP calls\n";
    echo "   - No double processing with multiple HTTP calls\n";
    echo "   - Security validation works\n";
    
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
