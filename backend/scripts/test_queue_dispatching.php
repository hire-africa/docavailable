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

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

echo "🧪 TESTING QUEUE DISPATCHING\n";
echo "============================\n\n";

try {
    // Test 1: Check queue configuration
    echo "📋 Test 1: Checking queue configuration...\n";
    $queueConnection = config('queue.default');
    echo "   Queue connection: {$queueConnection}\n";
    
    $queueTable = config('queue.connections.database.table');
    echo "   Queue table: {$queueTable}\n";
    
    // Test 2: Check if jobs table exists and is accessible
    echo "\n📋 Test 2: Checking jobs table...\n";
    try {
        $jobCount = DB::table('jobs')->count();
        echo "   Current jobs in table: {$jobCount}\n";
        echo "   ✅ Jobs table is accessible\n";
    } catch (Exception $e) {
        echo "   ❌ Jobs table error: " . $e->getMessage() . "\n";
        exit(1);
    }
    
    // Test 3: Try to dispatch a simple job
    echo "\n📋 Test 3: Testing simple job dispatch...\n";
    
    try {
        // Create a simple test job
        DB::table('jobs')->insert([
            'queue' => 'test-queue',
            'payload' => json_encode([
                'displayName' => 'TestJob',
                'data' => ['test' => 'data']
            ]),
            'attempts' => 0,
            'reserved_at' => null,
            'available_at' => now()->timestamp,
            'created_at' => now()->timestamp
        ]);
        
        echo "   ✅ Simple job inserted directly into database\n";
        
        // Check if job was created
        $testJobCount = DB::table('jobs')->where('queue', 'test-queue')->count();
        echo "   Test jobs in database: {$testJobCount}\n";
        
    } catch (Exception $e) {
        echo "   ❌ Failed to insert test job: " . $e->getMessage() . "\n";
    }
    
    // Test 4: Try to dispatch the actual job class
    echo "\n📋 Test 4: Testing ProcessTextSessionAutoDeduction dispatch...\n";
    
    try {
        $job = new \App\Jobs\ProcessTextSessionAutoDeduction(999, 1);
        echo "   ✅ Job class instantiated successfully\n";
        
        // Try to dispatch it
        $job->dispatch();
        echo "   ✅ Job dispatched successfully\n";
        
        // Check if job was created
        $autoDeductionJobs = DB::table('jobs')->where('queue', 'text-sessions')->count();
        echo "   Auto-deduction jobs in database: {$autoDeductionJobs}\n";
        
    } catch (Exception $e) {
        echo "   ❌ Failed to dispatch job: " . $e->getMessage() . "\n";
        echo "   Stack trace:\n" . $e->getTraceAsString() . "\n";
    }
    
    // Test 5: Try the dispatch method directly
    echo "\n📋 Test 5: Testing dispatch method directly...\n";
    
    try {
        \App\Jobs\ProcessTextSessionAutoDeduction::dispatch(999, 1);
        echo "   ✅ Static dispatch method worked\n";
        
        // Check if job was created
        $autoDeductionJobs = DB::table('jobs')->where('queue', 'text-sessions')->count();
        echo "   Auto-deduction jobs in database: {$autoDeductionJobs}\n";
        
    } catch (Exception $e) {
        echo "   ❌ Static dispatch failed: " . $e->getMessage() . "\n";
    }
    
    // Test 6: Check all jobs in database
    echo "\n📋 Test 6: Checking all jobs in database...\n";
    $allJobs = DB::table('jobs')->get();
    echo "   Total jobs in database: " . $allJobs->count() . "\n";
    
    foreach ($allJobs as $job) {
        $payload = json_decode($job->payload);
        $jobClass = $payload->displayName ?? 'Unknown';
        echo "   - Job: {$jobClass} (Queue: {$job->queue})\n";
    }
    
    // Cleanup
    echo "\n🧹 Cleanup...\n";
    DB::table('jobs')->delete();
    echo "   ✅ All test jobs cleaned up\n";
    
    echo "\n✅ QUEUE DISPATCHING TEST COMPLETED!\n";
    
} catch (Exception $e) {
    echo "❌ Test failed: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
