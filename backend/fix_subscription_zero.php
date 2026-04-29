<?php
/**
 * Subscription Fix + Diagnostic Script
 * 
 * Run this ON THE SERVER (DigitalOcean) in the backend directory:
 *   php fix_subscription_zero.php <user_id>
 * 
 * Or run with --fix flag to actually patch broken records:
 *   php fix_subscription_zero.php <user_id> --fix
 */

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

$userId = isset($argv[1]) && is_numeric($argv[1]) ? (int) $argv[1] : null;
$doFix  = in_array('--fix', $argv, true);

echo "\n══════════════════════════════════════════════════════\n";
echo "  SUBSCRIPTION ZERO-SESSION DIAGNOSTIC + FIX TOOL\n";
echo "  " . now()->toDateTimeString() . "\n";
echo "══════════════════════════════════════════════════════\n\n";

// ── Step 1: Raw DB query (bypasses all model logic) ────────────────────────

$query = DB::table('subscriptions');
if ($userId) $query->where('user_id', $userId);
$rows = $query->orderBy('created_at', 'desc')->limit(20)->get();

if ($rows->isEmpty()) {
    echo "❌  No subscription rows found" . ($userId ? " for user_id=$userId" : "") . "\n\n";
    exit(1);
}

echo "Found {$rows->count()} subscription row(s):\n\n";

$brokenIds = [];

foreach ($rows as $row) {
    $endDate   = $row->end_date   ? Carbon::parse($row->end_date)   : null;
    $expiresAt = $row->expires_at ? Carbon::parse($row->expires_at) : null;
    $isActive  = (bool) $row->is_active;
    $status    = (int)  $row->status;

    $passIsActive = $isActive === true;
    $passStatus   = $status === 1;
    $passEndDate  = !is_null($row->end_date);
    $passNotPast  = $endDate && !$endDate->isPast();
    $willCount    = $passIsActive && $passStatus && $passEndDate && $passNotPast;

    $problems = [];
    if (!$passIsActive) $problems[] = "is_active=" . ($row->is_active ?? 'NULL') . " (needs true/1)";
    if (!$passStatus)   $problems[] = "status=" . ($row->status ?? 'NULL') . " (needs 1)";
    if (!$passEndDate)  $problems[] = "end_date=NULL";
    if (!$passNotPast && $passEndDate)  $problems[] = "end_date={$row->end_date} IS IN THE PAST";

    echo "  ─── Sub ID #{$row->id} (user_id={$row->user_id}) ─────────────────────\n";
    echo "  Plan:      {$row->plan_name}\n";
    echo "  end_date:  " . ($row->end_date ?? 'NULL') . "\n";
    echo "  expires_at:" . ($row->expires_at ?? 'NULL') . "\n";
    echo "  is_active: " . ($row->is_active ?? 'NULL') . "  |  status: " . ($row->status ?? 'NULL') . "\n";
    echo "  Sessions:  text={$row->text_sessions_remaining}/{$row->total_text_sessions}"
       . "  voice={$row->voice_calls_remaining}/{$row->total_voice_calls}"
       . "  video={$row->video_calls_remaining}/{$row->total_video_calls}\n";

    if ($willCount) {
        echo "  ✅  This subscription WILL be found by getAggregatedSessions\n";
        if ((int)$row->text_sessions_remaining === 0 && (int)$row->total_text_sessions === 0) {
            echo "  ⚠️   But text_sessions_remaining = 0 and total_text_sessions = 0!\n";
            echo "       The plan was created with text_sessions = 0. This is a plan data issue.\n";
            $problems[] = "text_sessions_remaining=0 AND total_text_sessions=0 (plan had no sessions)";
            $brokenIds[] = $row->id;
        }
    } else {
        echo "  ❌  WILL NOT be found — Problems: " . implode(', ', $problems) . "\n";
        $brokenIds[] = $row->id;
    }
    echo "\n";
}

// ── Step 2: Run actual aggregation ────────────────────────────────────────

if ($userId) {
    echo "══════════════════════════════════════════════════════\n";
    echo "  WHAT getAggregatedSessions() RETURNS FOR user=$userId\n";
    echo "══════════════════════════════════════════════════════\n";

    $agg = DB::table('subscriptions')
        ->where('user_id', $userId)
        ->where('is_active', true)
        ->where('status', 1)
        ->whereNotNull('end_date')
        ->where('end_date', '>', now())
        ->get();

    echo "  Matching rows: " . $agg->count() . "\n";
    echo "  text_sessions_remaining:  " . $agg->sum('text_sessions_remaining') . "\n";
    echo "  voice_calls_remaining:    " . $agg->sum('voice_calls_remaining') . "\n";
    echo "  video_calls_remaining:    " . $agg->sum('video_calls_remaining') . "\n";
    echo "  total_text_sessions:      " . $agg->sum('total_text_sessions') . "\n\n";
}

// ── Step 3: Offer fix ───────────────────────────────────────────────────

if (!empty($brokenIds)) {
    echo "══════════════════════════════════════════════════════\n";
    echo "  DIAGNOSIS: " . count($brokenIds) . " broken subscription(s) found\n";
    echo "  IDs: " . implode(', ', $brokenIds) . "\n";
    echo "══════════════════════════════════════════════════════\n\n";

    if ($doFix) {
        echo "  Applying fixes...\n\n";
        foreach ($brokenIds as $subId) {
            $row = DB::table('subscriptions')->where('id', $subId)->first();
            $updates = [];

            if (!(bool)$row->is_active)  $updates['is_active'] = true;
            if ((int)$row->status !== 1) $updates['status']    = 1;
            if (is_null($row->end_date) && $row->expires_at) {
                $updates['end_date'] = $row->expires_at; // copy expires_at -> end_date
                echo "  ℹ️  Copying expires_at → end_date for sub #{$subId}\n";
            }

            if (!empty($updates)) {
                DB::table('subscriptions')->where('id', $subId)->update($updates);
                echo "  ✅  Fixed sub #{$subId}: " . json_encode($updates) . "\n";
            } else {
                echo "  ⚠️  Sub #{$subId}: No auto-fixable fields (may need manual plan session data fix)\n";
            }
        }

        // Clear the dashboard cache for this user
        if ($userId) {
            $cacheKey = "comprehensive_dashboard_summary_v2_{$userId}";
            DB::table('cache')->where('key', 'like', "%{$cacheKey}%")->delete();
            echo "\n  ✅  Cleared dashboard cache for user #{$userId}\n";
        }

        echo "\n  ✅  Done! Refresh the app to see updated session counts.\n\n";
    } else {
        echo "  ℹ️  Run with --fix to attempt auto-repair:\n";
        echo "      php fix_subscription_zero.php {$userId} --fix\n\n";
        echo "  Or run this SQL directly:\n";
        foreach ($brokenIds as $subId) {
            $row = DB::table('subscriptions')->where('id', $subId)->first();
            echo "    UPDATE subscriptions SET is_active=true, status=1";
            if (is_null($row->end_date) && $row->expires_at) {
                echo ", end_date=expires_at";
            }
            echo " WHERE id={$subId};\n";
        }
        echo "\n";
    }
} else {
    echo "══════════════════════════════════════════════════════\n";
    echo "  All subscription rows look structurally correct.\n";
    echo "  If sessions still show 0, the plan itself had\n";
    echo "  text_sessions=0 when the subscription was created.\n";
    echo "══════════════════════════════════════════════════════\n\n";
    echo "  To check the plan:\n";
    if ($userId) {
        $sub = DB::table('subscriptions')->where('user_id', $userId)->orderBy('created_at','desc')->first();
        if ($sub) {
            $plan = DB::table('plans')->where('id', $sub->plan_id)->first();
            if ($plan) {
                echo "  Plan #" . $plan->id . " — " . $plan->name . "\n";
                echo "    text_sessions:  " . ($plan->text_sessions ?? 'NULL') . "\n";
                echo "    voice_calls:    " . ($plan->voice_calls ?? 'NULL') . "\n";
                echo "    video_calls:    " . ($plan->video_calls ?? 'NULL') . "\n";
            }
        }
    }
    echo "\n";
}
