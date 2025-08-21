<?php

require_once __DIR__ . '/../vendor/autoload.php';

use App\Models\TextSession;
use App\Models\User;
use App\Models\Plan;
use Illuminate\Support\Facades\DB;

// Bootstrap Laravel
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🧪 Testing Safety Net Auto-Deduction System\n";
echo "==========================================\n\n";

try {
    // Find or create test users
    $patient = User::where('user_type', 'patient')->first();
    $doctor = User::where('user_type', 'doctor')->first();
    
    if (!$patient || !$doctor) {
        echo "❌ Test users not found. Please ensure you have patient and doctor users.\n";
        exit(1);
    }
    
    echo "✅ Found test users:\n";
    echo "   Patient: {$patient->first_name} (ID: {$patient->id})\n";
    echo "   Doctor: {$doctor->first_name} (ID: {$doctor->id})\n\n";
    
    // Get patient's current session count
    $initialSessions = $patient->text_sessions_available;
    $initialDoctorBalance = $doctor->wallet_balance;
    
    echo "📊 Initial State:\n";
    echo "   Patient sessions: {$initialSessions}\n";
    echo "   Doctor balance: $" . number_format($initialDoctorBalance / 100, 2) . "\n\n";
    
    // Create a test session that should be expired
    $expiredSession = TextSession::create([
        'patient_id' => $patient->id,
        'doctor_id' => $doctor->id,
        'status' => TextSession::STATUS_ACTIVE,
        'activated_at' => now(), // Start with current time
        'sessions_used' => 0,
        'auto_deductions_processed' => 0,
        'started_at' => now(),
        'last_activity_at' => now(),
        'sessions_remaining_before_start' => 1, // Only 1 session = 10 minutes total
    ]);
    
    // Now update the timestamps to be 22 minutes ago using raw SQL
    DB::table('text_sessions')
        ->where('id', $expiredSession->id)
        ->update([
            'activated_at' => DB::raw("NOW() - INTERVAL '22 minutes'"),
            'started_at' => DB::raw("NOW() - INTERVAL '22 minutes'"),
            'last_activity_at' => DB::raw("NOW() - INTERVAL '22 minutes'"),
            'created_at' => DB::raw("NOW() - INTERVAL '22 minutes'"),
            'updated_at' => DB::raw("NOW() - INTERVAL '22 minutes'"),
        ]);
    
    // Refresh the model to get the updated timestamps
    $expiredSession->refresh();
    
    echo "🔧 Created test session:\n";
    echo "   Session ID: {$expiredSession->id}\n";
    echo "   Activated: " . $expiredSession->activated_at->format('H:i:s') . "\n";
    echo "   Elapsed: " . now()->diffInMinutes($expiredSession->activated_at) . " minutes\n";
    echo "   Total allowed minutes: " . $expiredSession->getTotalAllowedMinutes() . "\n";
    echo "   Expected deductions: " . floor(now()->diffInMinutes($expiredSession->activated_at) / 10) . "\n";
    echo "   Has run out of time: " . ($expiredSession->hasRunOutOfTime() ? 'Yes' : 'No') . "\n\n";
    
    // Run the auto-ending command
    echo "🚀 Running auto-ending command...\n";
    $output = shell_exec('php artisan sessions:process-expired-text-sessions 2>&1');
    echo $output . "\n";
    
    // Refresh models
    $patient->refresh();
    $doctor->refresh();
    $expiredSession->refresh();
    
    // Check results
    echo "📊 Final State:\n";
    echo "   Patient sessions: {$patient->text_sessions_available} (was {$initialSessions})\n";
    echo "   Doctor balance: $" . number_format($doctor->wallet_balance / 100, 2) . " (was $" . number_format($initialDoctorBalance / 100, 2) . ")\n";
    echo "   Session status: {$expiredSession->status}\n";
    echo "   Sessions used: {$expiredSession->sessions_used}\n";
    echo "   Auto-deductions processed: {$expiredSession->auto_deductions_processed}\n";
    echo "   Ended at: " . ($expiredSession->ended_at ? $expiredSession->ended_at->format('H:i:s') : 'Not ended') . "\n\n";
    
    // Verify results
    $sessionsDeducted = $initialSessions - $patient->text_sessions_available;
    $doctorEarned = $doctor->wallet_balance - $initialDoctorBalance;
    
    echo "✅ Verification:\n";
    echo "   Sessions deducted: {$sessionsDeducted}\n";
    echo "   Doctor earned: $" . number_format($doctorEarned / 100, 2) . "\n";
    echo "   Expected deductions: 2\n";
    echo "   Expected earnings: $1.00\n\n";
    
    if ($sessionsDeducted === 2 && $doctorEarned === 100 && $expiredSession->status === 'ended') {
        echo "🎉 SUCCESS: Safety net auto-deduction working correctly!\n";
        echo "   - Correct number of sessions deducted\n";
        echo "   - Doctor earnings calculated correctly\n";
        echo "   - Session ended properly\n";
        echo "   - No double deductions occurred\n";
    } else {
        echo "❌ FAILED: Safety net auto-deduction not working as expected\n";
    }
    
    // Clean up
    $expiredSession->delete();
    echo "\n🧹 Test session cleaned up.\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
