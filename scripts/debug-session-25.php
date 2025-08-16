<?php

require_once __DIR__ . '/../backend/vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\TextSession;
use Carbon\Carbon;

echo "🔍 DEBUGGING TEXT SESSION 25\n";
echo "============================\n\n";

try {
    // Get session 25 specifically
    $session = TextSession::with(['patient', 'doctor'])->find(25);
    
    if (!$session) {
        echo "❌ Session 25 not found!\n";
        exit(1);
    }
    
    echo "📋 Session 25 Details:\n";
    echo "  ID: {$session->id}\n";
    echo "  Status: {$session->status}\n";
    echo "  Patient: {$session->patient->first_name} {$session->patient->last_name} (ID: {$session->patient_id})\n";
    echo "  Doctor: {$session->doctor->first_name} {$session->doctor->last_name} (ID: {$session->doctor_id})\n";
    echo "  Started: {$session->started_at}\n";
    echo "  Last Activity: {$session->last_activity_at}\n";
    echo "  Ended: " . ($session->ended_at ? $session->ended_at : 'Not ended') . "\n";
    echo "  Sessions Remaining Before Start: {$session->sessions_remaining_before_start}\n";
    echo "  Sessions Used: {$session->sessions_used}\n";
    echo "  Auto Deductions Processed: " . ($session->auto_deductions_processed ?? 'Not set') . "\n";
    echo "\n";
    
    // Calculate time details
    $now = Carbon::now();
    $startedAt = Carbon::parse($session->started_at);
    $elapsedMinutes = $startedAt->diffInMinutes($now);
    $totalAllowedMinutes = $session->sessions_remaining_before_start * 10;
    $remainingMinutes = max(0, $totalAllowedMinutes - $elapsedMinutes);
    
    echo "⏰ Time Calculations:\n";
    echo "  Current Time: {$now}\n";
    echo "  Started At: {$startedAt}\n";
    echo "  Elapsed Minutes: {$elapsedMinutes}\n";
    echo "  Total Allowed Minutes: {$totalAllowedMinutes}\n";
    echo "  Remaining Minutes: {$remainingMinutes}\n";
    echo "  Has Run Out of Time: " . ($remainingMinutes <= 0 ? 'YES' : 'NO') . "\n";
    echo "\n";
    
    // Check model methods
    echo "📊 Model Method Results:\n";
    echo "  getElapsedMinutes(): {$session->getElapsedMinutes()}\n";
    echo "  getTotalAllowedMinutes(): {$session->getTotalAllowedMinutes()}\n";
    echo "  getRemainingTimeMinutes(): {$session->getRemainingTimeMinutes()}\n";
    echo "  getRemainingSessions(): {$session->getRemainingSessions()}\n";
    echo "  hasRunOutOfTime(): " . ($session->hasRunOutOfTime() ? 'YES' : 'NO') . "\n";
    echo "  shouldAutoEnd(): " . ($session->shouldAutoEnd() ? 'YES' : 'NO') . "\n";
    echo "\n";
    
    // Check if status should be different
    echo "🔍 Status Analysis:\n";
    if ($session->status === 'expired' && $remainingMinutes > 0) {
        echo "  ⚠️  INCONSISTENCY: Session is marked as 'expired' but has {$remainingMinutes} minutes remaining!\n";
        echo "  This session should probably be 'active' or 'waiting_for_doctor'\n";
    } elseif ($session->status === 'active' && $remainingMinutes <= 0) {
        echo "  ⚠️  INCONSISTENCY: Session is marked as 'active' but has run out of time!\n";
        echo "  This session should probably be 'ended'\n";
    } else {
        echo "  ✅ Status appears consistent with time remaining\n";
    }
    
    // Check if this should be showing in active sessions
    echo "\n📱 Should Show in Active Sessions:\n";
    $shouldShow = in_array($session->status, ['active', 'waiting_for_doctor']) && $remainingMinutes > 0;
    echo "  Status in ['active', 'waiting_for_doctor']: " . (in_array($session->status, ['active', 'waiting_for_doctor']) ? 'YES' : 'NO') . "\n";
    echo "  Has time remaining: " . ($remainingMinutes > 0 ? 'YES' : 'NO') . "\n";
    echo "  Should show in active sessions: " . ($shouldShow ? 'YES' : 'NO') . "\n";
    
    if (!$shouldShow && $remainingMinutes > 0) {
        echo "  💡 SUGGESTION: This session should be updated to 'active' status\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}

echo "\n✅ Debug completed!\n";
