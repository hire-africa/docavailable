<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Jobs\ProcessTextSessionAutoDeduction;
use App\Jobs\EndTextSession;

class ProcessQueueJobs
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Illuminate\Http\Response|\Illuminate\Http\RedirectResponse)  $next
     * @return \Illuminate\Http\Response|\Illuminate\Http\RedirectResponse
     */
    public function handle(Request $request, Closure $next)
    {
        // Process queue jobs before handling the request
        $this->processPendingQueueJobs();
        
        return $next($request);
    }
    
    /**
     * Process pending queue jobs for text sessions
     */
    private function processPendingQueueJobs(): void
    {
        try {
            // Only process jobs every 30 seconds to avoid overwhelming the system
            $lastProcessed = cache()->get('last_queue_processing', 0);
            $now = time();
            
            if (($now - $lastProcessed) < 30) {
                return; // Skip if processed recently
            }
            
            // Get pending jobs from the text-sessions queue
            $jobs = DB::table('jobs')
                ->where('queue', 'text-sessions')
                ->where('available_at', '<=', now()->timestamp) // Process jobs that are ready to run
                ->get();
            
            if ($jobs->count() === 0) {
                cache()->put('last_queue_processing', $now, 60);
                return;
            }
            
            Log::info("Processing {$jobs->count()} pending queue jobs");
            
            $processedCount = 0;
            $failedCount = 0;
            
            foreach ($jobs as $job) {
                try {
                    $payload = json_decode($job->payload);
                    $jobClass = $payload->displayName ?? 'Unknown';
                    $jobData = $payload->data ?? [];
                    
                    if (strpos($jobClass, 'ProcessTextSessionAutoDeduction') !== false) {
                        $sessionId = $jobData->sessionId ?? null;
                        $expectedDeductionCount = $jobData->expectedDeductionCount ?? 1;
                        
                        if ($sessionId) {
                            $autoDeductionJob = new ProcessTextSessionAutoDeduction($sessionId, $expectedDeductionCount);
                            $autoDeductionJob->handle();
                            $processedCount++;
                            Log::info("Processed auto-deduction for session {$sessionId}");
                        }
                        
                    } elseif (strpos($jobClass, 'EndTextSession') !== false) {
                        $sessionId = $jobData->sessionId ?? null;
                        $reason = $jobData->reason ?? 'time_expired';
                        
                        if ($sessionId) {
                            $autoEndJob = new EndTextSession($sessionId, $reason);
                            $autoEndJob->handle();
                            $processedCount++;
                            Log::info("Processed auto-end for session {$sessionId} (reason: {$reason})");
                        }
                    }
                    
                    // Delete the processed job
                    DB::table('jobs')->where('id', $job->id)->delete();
                    
                } catch (\Exception $e) {
                    Log::error('Failed to process queue job: ' . $e->getMessage());
                    $failedCount++;
                }
            }
            
            if ($processedCount > 0 || $failedCount > 0) {
                Log::info("Queue processing completed: {$processedCount} processed, {$failedCount} failed");
            }
            
            // Update last processed timestamp
            cache()->put('last_queue_processing', $now, 60);
            
        } catch (\Exception $e) {
            Log::error('Error in queue processing middleware: ' . $e->getMessage());
        }
    }
}
