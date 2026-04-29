<?php
/**
 * Subscription Diagnostic Script
 * Run: php check_subscription_live.php <user_id>
 * Or:  php check_subscription_live.php   (checks all patient subscriptions)
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Subscription;
use App\Models\User;
use Carbon\Carbon;

$userId = $argv[1] ?? null;

echo "\n====================================================\n";
echo "  SUBSCRIPTION DIAGNOSTIC REPORT\n";
echo "  Run at: " . now()->toDateTimeString() . "\n";
echo "====================================================\n\n";

$query = Subscription::query();
if ($userId) {
    $query->where('user_id', $userId);
} else {
    // Show last 10 subscriptions across all patients
    $query->orderBy('created_at', 'desc')->limit(10);
}

$subs = $query->get();

if ($subs->isEmpty()) {
    echo "❌ No subscriptions found" . ($userId ? " for user_id=$userId" : "") . "\n\n";
    exit(1);
}

foreach ($subs as $sub) {
    $user = User::find($sub->user_id);
    $userName = $user ? ($user->first_name . ' ' . $user->last_name . ' (#' . $user->id . ')') : 'Unknown User #' . $sub->user_id;

    $endDate    = $sub->end_date   ? Carbon::parse($sub->end_date)   : null;
    $expDate    = $sub->expires_at ? Carbon::parse($sub->expires_at) : null;
    $isExpired  = $endDate && $endDate->isPast();
    $daysLeft   = $endDate ? max(0, (int) now()->diffInDays($endDate, false)) : 'N/A';

    echo "----------------------------------------------------\n";
    echo "  User:        $userName\n";
    echo "  Sub ID:      {$sub->id}\n";
    echo "  Plan:        {$sub->plan_name} (plan_id={$sub->plan_id})\n";
    echo "\n";
    echo "  ─── Status Fields ───────────────────────────────\n";
    echo "  is_active:   " . var_export((bool)$sub->is_active, true) . "\n";
    echo "  status:      {$sub->status}  (must be 1 to count)\n";
    echo "  start_date:  {$sub->start_date}\n";
    echo "  end_date:    {$sub->end_date}  " . ($isExpired ? '🔴 EXPIRED' : '✅ VALID') . "\n";
    echo "  expires_at:  {$sub->expires_at}\n";
    echo "  days_left:   {$daysLeft}\n";
    echo "\n";
    echo "  ─── Session Counts ──────────────────────────────\n";
    echo "  text_sessions_remaining:  {$sub->text_sessions_remaining}  /  total: {$sub->total_text_sessions}\n";
    echo "  voice_calls_remaining:    {$sub->voice_calls_remaining}   /  total: {$sub->total_voice_calls}\n";
    echo "  video_calls_remaining:    {$sub->video_calls_remaining}   /  total: {$sub->total_video_calls}\n";
    echo "\n";
    echo "  ─── getAggregatedSessions Query Checks ──────────\n";

    $passIsActive  = (bool)$sub->getRawOriginal('is_active');
    $passStatus    = (int)$sub->status === 1;
    $passEndDate   = !is_null($sub->end_date);
    $passNotPast   = $endDate && !$endDate->isPast();

    echo "  WHERE is_active = true:      " . ($passIsActive  ? '✅ PASS' : '❌ FAIL (is_active is false/0)') . "\n";
    echo "  WHERE status = 1:            " . ($passStatus    ? '✅ PASS' : '❌ FAIL (status=' . $sub->status . ')') . "\n";
    echo "  WHERE end_date IS NOT NULL:  " . ($passEndDate   ? '✅ PASS' : '❌ FAIL (end_date is NULL)') . "\n";
    echo "  WHERE end_date > now():      " . ($passNotPast   ? '✅ PASS' : '❌ FAIL (end_date is in the past)') . "\n";

    $willBeFound = $passIsActive && $passStatus && $passEndDate && $passNotPast;
    echo "\n";
    echo "  ══ Will be included in aggregation? " . ($willBeFound ? '✅ YES' : '❌ NO — THIS IS WHY SESSIONS = 0') . " ══\n";

    if (!$willBeFound) {
        echo "\n  📋 FIX SUGGESTION:\n";
        if (!$passIsActive) echo "     → Run: UPDATE subscriptions SET is_active=1 WHERE id={$sub->id};\n";
        if (!$passStatus)   echo "     → Run: UPDATE subscriptions SET status=1 WHERE id={$sub->id};\n";
        if (!$passEndDate)  echo "     → end_date is NULL! Run: UPDATE subscriptions SET end_date=NOW()+INTERVAL 30 DAY WHERE id={$sub->id};\n";
        if (!$passNotPast)  echo "     → end_date has passed. Subscription genuinely expired.\n";
    }

    echo "\n";
}

// Show what getAggregatedSessions would actually return
if ($userId) {
    echo "====================================================\n";
    echo "  AGGREGATED RESULT (what /subscription returns)\n";
    echo "====================================================\n";
    $agg = Subscription::getAggregatedSessions((int)$userId);
    echo "  text_sessions_remaining:  {$agg['text_sessions_remaining']}\n";
    echo "  voice_calls_remaining:    {$agg['voice_calls_remaining']}\n";
    echo "  video_calls_remaining:    {$agg['video_calls_remaining']}\n";
    echo "  total_text_sessions:      {$agg['total_text_sessions']}\n";
    echo "  subscriptions_found:      " . $agg['subscriptions']->count() . "\n\n";
}
