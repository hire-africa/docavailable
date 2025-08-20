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

echo "🧪 Testing 1-Minute Buffer\n";
echo "==========================\n\n";

// Find test users
$patient = User::where('user_type', 'patient')->first();
$doctor = User::where('user_type', 'doctor')->first();

if (!$patient || !$doctor) {
    echo "❌ Need both patient and doctor users for testing\n";
    exit;
}

// Test scenario: Session activated 11 minutes ago (should end at 11 minutes with 1-minute buffer)
echo "1️⃣ Creating test session activated 11 minutes ago...\n";

$session = TextSession::create([
    'patient_id' => $patient->id,
    'doctor_id' => $doctor->id,
    'status' => 'active',
    'started_at' => now()->subMinutes(15),
    'activated_at' => now()->subMinutes(11), // Activated 11 minutes ago
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
echo "   Remaining time (with 1-min buffer): " . $session->getRemainingTimeMinutes() . "\n";
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
    echo "   ⚠️  Session should be ended (auto-deductions should process first)\n";
} else {
    echo "   ✅ Session should continue running\n";
}

echo "\n4️⃣ Summary:\n";
echo "   With 1-minute buffer:\n";
echo "   - Auto-deductions process at 10 minutes\n";
echo "   - Sessions end at 11 minutes (1-minute delay)\n";
echo "   - This ensures deductions happen before ending\n";

// Clean up
$session->delete();
echo "\n🧹 Cleaned up test session\n";
