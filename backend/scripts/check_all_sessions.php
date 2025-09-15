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
use Illuminate\Support\Facades\DB;

echo "🔍 Checking All Text Sessions\n";
echo "=============================\n\n";

// Get all text sessions
$sessions = TextSession::orderBy('id', 'desc')->limit(20)->get();

echo "📊 Recent Sessions Summary:\n";
echo "ID\tStatus\t\tActivated\t\tElapsed\tUsed\tRemaining\n";
echo "---\t------\t\t---------\t\t-------\t----\t---------\n";

foreach ($sessions as $session) {
    $elapsed = $session->activated_at ? now()->diffInMinutes($session->activated_at) : 'N/A';
    $remaining = $session->sessions_remaining_before_start ?? 'N/A';
    
    echo sprintf(
        "%d\t%s\t%s\t%s\t%d\t%s\n",
        $session->id,
        str_pad($session->status, 12),
        $session->activated_at ? $session->activated_at->format('H:i:s') : 'N/A',
        str_pad($elapsed . 'm', 8),
        $session->sessions_used,
        $remaining
    );
}

echo "\n🔍 Active Sessions (should be eligible for auto-deductions):\n";
echo "==========================================================\n";

$activeSessions = TextSession::where('status', 'active')
    ->whereNotNull('activated_at')
    ->orderBy('activated_at', 'desc')
    ->get();

if ($activeSessions->count() > 0) {
    foreach ($activeSessions as $session) {
        $elapsedMinutes = now()->diffInMinutes($session->activated_at);
        $expectedDeductions = floor($elapsedMinutes / 10);
        
        echo "Session " . $session->id . ":\n";
        echo "  Activated: " . $session->activated_at->format('Y-m-d H:i:s') . "\n";
        echo "  Elapsed: " . $elapsedMinutes . " minutes\n";
        echo "  Expected deductions: " . $expectedDeductions . "\n";
        echo "  Current deductions: " . $session->sessions_used . "\n";
        
        if ($expectedDeductions > $session->sessions_used) {
            echo "  ❌ MISSING: " . ($expectedDeductions - $session->sessions_used) . " deductions\n";
        } else {
            echo "  ✅ Deductions look correct\n";
        }
        echo "\n";
    }
} else {
    echo "❌ No active sessions found!\n";
}

echo "\n🔍 Recently Ended Sessions:\n";
echo "===========================\n";

$recentEnded = TextSession::where('status', 'ended')
    ->whereNotNull('activated_at')
    ->orderBy('updated_at', 'desc')
    ->limit(5)
    ->get();

foreach ($recentEnded as $session) {
    $elapsedMinutes = $session->updated_at->diffInMinutes($session->activated_at);
    $expectedDeductions = floor($elapsedMinutes / 10);
    
    echo "Session " . $session->id . ":\n";
    echo "  Activated: " . $session->activated_at->format('Y-m-d H:i:s') . "\n";
    echo "  Ended: " . $session->updated_at->format('Y-m-d H:i:s') . "\n";
    echo "  Duration: " . $elapsedMinutes . " minutes\n";
    echo "  Expected deductions: " . $expectedDeductions . "\n";
    echo "  Actual deductions: " . $session->sessions_used . "\n";
    
    if ($expectedDeductions > $session->sessions_used) {
        echo "  ❌ MISSING: " . ($expectedDeductions - $session->sessions_used) . " deductions\n";
    } else {
        echo "  ✅ Deductions look correct\n";
    }
    echo "\n";
}
