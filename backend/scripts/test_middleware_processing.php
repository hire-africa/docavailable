<?php

require_once __DIR__ . '/../vendor/autoload.php';

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

// Bootstrap Laravel
$app = Application::configure(basePath: __DIR__ . '/..')
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
use App\Models\Subscription;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

echo "🧪 TESTING MIDDLEWARE PROCESSING\n";
echo "================================\n\n";

try {
    // Step 1: Create a test job
    echo "📋 STEP 1: Creating test job...\n";
    
    // Clear any existing jobs
    DB::table('jobs')->where('queue', 'text-sessions')->delete();
    
    // Create a test auto-deduction job
    \App\Jobs\ProcessTextSessionAutoDeduction::dispatch(999, 1)
        ->onConnection('text-sessions');
    
    $jobCount = DB::table('jobs')->where('queue', 'text-sessions')->count();
    echo "   Created {$jobCount} test job(s)\n\n";
    
    // Step 2: Test middleware processing
    echo "📋 STEP 2: Testing middleware processing...\n";
    
    // Clear the cache to force processing
    cache()->forget('last_queue_processing');
    
    // Create a mock request and run the middleware
    $middleware = new \App\Http\Middleware\ProcessQueueJobs();
    $request = \Illuminate\Http\Request::create('/test', 'GET');
    
    // Use reflection to call the private method directly
    $reflection = new ReflectionClass($middleware);
    $method = $reflection->getMethod('processPendingQueueJobs');
    $method->setAccessible(true);
    
    echo "   Running middleware processing...\n";
    $method->invoke($middleware);
    
    // Step 3: Check results
    echo "📋 STEP 3: Checking results...\n";
    
    $remainingJobs = DB::table('jobs')->where('queue', 'text-sessions')->count();
    echo "   Remaining jobs: {$remainingJobs}\n";
    
    $lastProcessing = cache()->get('last_queue_processing');
    echo "   Last processing timestamp: " . ($lastProcessing ? date('Y-m-d H:i:s', $lastProcessing) : 'NEVER') . "\n";
    
    if ($remainingJobs === 0) {
        echo "   ✅ Middleware successfully processed the test job!\n";
    } else {
        echo "   ❌ Middleware did not process the job\n";
    }
    
    echo "\n💡 CONCLUSION:\n";
    if ($remainingJobs === 0) {
        echo "   The middleware IS working correctly.\n";
        echo "   The issue might be that jobs are not being created for real sessions.\n";
    } else {
        echo "   The middleware is NOT processing jobs.\n";
        echo "   This explains why auto-deductions are not working.\n";
    }
    
} catch (Exception $e) {
    echo "❌ Test failed: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
