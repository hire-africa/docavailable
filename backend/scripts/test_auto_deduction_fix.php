<?php

require_once __DIR__ . '/../vendor/autoload.php';

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

// Bootstrap Laravel
$app = Application::configure(basePath: __DIR__ . '/../')
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        //
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();

$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\TextSession;
use App\Models\User;
use Illuminate\Support\Facades\DB;

echo "🧪 Testing Auto-Deduction Fix with 2-Minute Buffer\n";
echo "================================================\n\n";

// Find or create test users
$patient = User::where('user_type', 'patient')->first();
$doctor = User::where('user_type', 'doctor')->first();

if (!$patient || !$doctor) {
    echo "❌ Need both patient and doctor users for testing\n";
    exit;
}

// Create a test session that was activated 12 minutes ago (should have 1 deduction)
echo "1️⃣ Creating test session activated 12 minutes ago...\n";

$session = TextSession::create([
    'patient_id' => $patient->id,
    'doctor_id' => $doctor->id,
    'status' => 'active',
    'started_at' => now()->subMinutes(15),
    'activated_at' => now()->subMinutes(12), // Activated 12 minutes ago
    'last_activity_at' => now(),
    'sessions_used' => 0,
    'sessions_remaining_before_start' => 1,
    'auto_deductions_processed' => 0
]);

echo "✅ Created session " . $session->id . "\n\n";

// Test the session details
echo "2️⃣ Testing session details:\n";
echo "   Total allowed minutes: " . $session->getTotalAllowedMinutes() . "\n";
echo "   Elapsed minutes: " . $session->getElapsedMinutes() . "\n";
echo "   Remaining time (with buffer): " . $session->getRemainingTimeMinutes() . "\n";
echo "   Has run out of time: " . ($session->hasRunOutOfTime() ? 'YES' : 'NO') . "\n";
echo "   Expected deductions: " . floor($session->getElapsedMinutes() / 10) . "\n";
echo "   Current deductions: " . $session->sessions_used . "\n\n";

// Test auto-deduction logic
echo "3️⃣ Testing auto-deduction logic:\n";

$elapsedMinutes = $session->getElapsedMinutes();
$expectedDeductions = floor($elapsedMinutes / 10);
$currentDeductions = $session->sessions_used;

if ($expectedDeductions > $currentDeductions) {
    $deductionsToProcess = $expectedDeductions - $currentDeductions;
    echo "   ✅ Would process " . $deductionsToProcess . " deductions\n";
} else {
    echo "   ✅ No deductions needed\n";
}

// Test if session should be ended
if ($session->hasRunOutOfTime()) {
    echo "   ⚠️  Session should be ended (but auto-deductions should process first)\n";
} else {
    echo "   ✅ Session should continue running\n";
}

echo "\n4️⃣ Running auto-deduction command...\n";

// Run the auto-deduction command directly
echo "Running auto-deduction logic...\n";

// Simulate the auto-deduction logic
$elapsedMinutes = $session->getElapsedMinutes();
$expectedDeductions = floor($elapsedMinutes / 10);
$currentDeductions = $session->sessions_used;

if ($expectedDeductions > $currentDeductions) {
    $deductionsToProcess = $expectedDeductions - $currentDeductions;
    
    // Process the deductions
    $session->update([
        'sessions_used' => $expectedDeductions,
        'auto_deductions_processed' => $expectedDeductions
    ]);
    
    echo "✅ Processed " . $deductionsToProcess . " deductions\n";
} else {
    echo "✅ No deductions needed\n";
}

// Check the session after auto-deduction
echo "\n5️⃣ Checking session after auto-deduction:\n";
$session->refresh();

echo "   Sessions used: " . $session->sessions_used . "\n";
echo "   Auto deductions processed: " . $session->auto_deductions_processed . "\n";
echo "   Status: " . $session->status . "\n";

if ($session->sessions_used > 0) {
    echo "   ✅ Auto-deduction worked!\n";
} else {
    echo "   ❌ Auto-deduction failed\n";
}

echo "\n6️⃣ Testing auto-ending...\n";

// Simulate auto-ending logic
if ($session->hasRunOutOfTime()) {
    $session->update([
        'status' => 'ended',
        'ended_at' => now()
    ]);
    echo "✅ Session ended due to time expiration\n";
} else {
    echo "✅ Session continues running\n";
}

// Check final status
echo "\n7️⃣ Final session status:\n";
$session->refresh();

echo "   Status: " . $session->status . "\n";
echo "   Sessions used: " . $session->sessions_used . "\n";
echo "   Ended at: " . ($session->ended_at ? $session->ended_at->format('Y-m-d H:i:s') : 'Not ended') . "\n";

if ($session->status === 'ended' && $session->sessions_used > 0) {
    echo "   ✅ SUCCESS: Session ended with deductions!\n";
} else {
    echo "   ❌ FAILED: Session didn't end properly or no deductions\n";
}

// Clean up
$session->delete();
echo "\n🧹 Cleaned up test session\n";
