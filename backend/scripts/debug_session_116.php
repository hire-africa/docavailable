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

echo "🔍 Debugging Session 116\n";
echo "========================\n\n";

// Get session 116
$session = TextSession::find(116);

if (!$session) {
    echo "❌ Session 116 not found!\n";
    exit;
}

echo "📋 Session 116 Details:\n";
echo "ID: " . $session->id . "\n";
echo "Status: " . $session->status . "\n";
echo "Started At: " . $session->started_at . "\n";
echo "Activated At: " . $session->activated_at . "\n";
echo "Last Activity: " . $session->last_activity_at . "\n";
echo "Sessions Used: " . $session->sessions_used . "\n";
echo "Sessions Remaining Before Start: " . $session->sessions_remaining_before_start . "\n";
echo "Auto Deductions Processed: " . $session->auto_deductions_processed . "\n";
echo "Patient ID: " . $session->patient_id . "\n";
echo "Doctor ID: " . $session->doctor_id . "\n\n";

// Check if session is active
if ($session->status !== 'active') {
    echo "⚠️  Session is NOT active (status: " . $session->status . ")\n";
    echo "   Auto-deductions only work on active sessions\n\n";
}

// Check if session has been activated
if (!$session->activated_at) {
    echo "⚠️  Session has NOT been activated (activated_at is null)\n";
    echo "   Auto-deductions only work after activation\n\n";
} else {
    $elapsedMinutes = now()->diffInMinutes($session->activated_at);
    echo "⏱️  Elapsed minutes since activation: " . $elapsedMinutes . "\n";
    
    // Calculate expected deductions
    $expectedDeductions = floor($elapsedMinutes / 10);
    echo "📊 Expected deductions: " . $expectedDeductions . "\n";
    echo "📊 Current sessions used: " . $session->sessions_used . "\n";
    
    if ($expectedDeductions > $session->sessions_used) {
        echo "❌ MISSING DEDUCTIONS! Should have " . $expectedDeductions . " but only has " . $session->sessions_used . "\n\n";
    } else {
        echo "✅ Deductions look correct\n\n";
    }
}

// Check patient's session balance
$patient = User::find($session->patient_id);
if ($patient) {
    echo "👤 Patient Details:\n";
    echo "ID: " . $patient->id . "\n";
    echo "Name: " . $patient->name . "\n";
    echo "Sessions Remaining: " . $patient->sessions_remaining . "\n\n";
}

// Check doctor's details
$doctor = User::find($session->doctor_id);
if ($doctor) {
    echo "👨‍⚕️ Doctor Details:\n";
    echo "ID: " . $doctor->id . "\n";
    echo "Name: " . $doctor->name . "\n\n";
}

// Check if there are any recent logs
echo "📝 Recent Logs:\n";
$logs = DB::table('logs')
    ->where('message', 'like', '%session%116%')
    ->orWhere('message', 'like', '%Session 116%')
    ->orWhere('message', 'like', '%auto-deduction%')
    ->orderBy('created_at', 'desc')
    ->limit(10)
    ->get();

if ($logs->count() > 0) {
    foreach ($logs as $log) {
        echo "- " . $log->created_at . ": " . $log->message . "\n";
    }
} else {
    echo "No recent logs found\n";
}

echo "\n🔧 Testing Auto-Deduction Logic:\n";
echo "===============================\n";

// Simulate the auto-deduction logic
if ($session->status === 'active' && $session->activated_at) {
    $elapsedMinutes = now()->diffInMinutes($session->activated_at);
    $expectedDeductions = floor($elapsedMinutes / 10);
    $currentDeductions = $session->sessions_used;
    
    echo "Elapsed minutes: " . $elapsedMinutes . "\n";
    echo "Expected deductions: " . $expectedDeductions . "\n";
    echo "Current deductions: " . $currentDeductions . "\n";
    
    if ($expectedDeductions > $currentDeductions) {
        $deductionsToProcess = $expectedDeductions - $currentDeductions;
        echo "✅ Would process " . $deductionsToProcess . " deductions\n";
    } else {
        echo "✅ No deductions needed\n";
    }
} else {
    echo "❌ Session not eligible for auto-deductions\n";
}
