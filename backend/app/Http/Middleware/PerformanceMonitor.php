<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class PerformanceMonitor
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $startTime = microtime(true);
        $startMemory = memory_get_usage();

        // Process the request
        $response = $next($request);

        // Calculate performance metrics
        $endTime = microtime(true);
        $endMemory = memory_get_usage();
        
        $executionTime = ($endTime - $startTime) * 1000; // Convert to milliseconds
        $memoryUsage = $endMemory - $startMemory;
        $memoryUsageMB = round($memoryUsage / 1024 / 1024, 2);

        // Log performance data
        $this->logPerformance($request, $response, $executionTime, $memoryUsageMB);

        // Store metrics for monitoring
        $this->storeMetrics($request, $executionTime, $memoryUsageMB);

        // Add performance headers
        $response->headers->set('X-Execution-Time', round($executionTime, 2) . 'ms');
        $response->headers->set('X-Memory-Usage', $memoryUsageMB . 'MB');

        return $response;
    }

    /**
     * Log performance data
     */
    protected function logPerformance(Request $request, Response $response, float $executionTime, float $memoryUsageMB): void
    {
        $logData = [
            'method' => $request->method(),
            'url' => $request->fullUrl(),
            'user_id' => $request->user()?->id,
            'execution_time_ms' => round($executionTime, 2),
            'memory_usage_mb' => $memoryUsageMB,
            'status_code' => $response->getStatusCode(),
            'user_agent' => $request->userAgent(),
            'ip' => $request->ip(),
        ];

        // Log slow requests
        if ($executionTime > 1000) { // More than 1 second
            Log::warning('Slow API request detected', $logData);
        }

        // Log high memory usage
        if ($memoryUsageMB > 50) { // More than 50MB
            Log::warning('High memory usage detected', $logData);
        }

        // Log all requests in debug mode
        if (config('app.debug')) {
            Log::info('API Performance', $logData);
        }
    }

    /**
     * Store metrics for monitoring
     */
    protected function storeMetrics(Request $request, float $executionTime, float $memoryUsageMB): void
    {
        $endpoint = $request->method() . ' ' . $request->path();
        $date = now()->format('Y-m-d');
        $hour = now()->format('H');

        // Store endpoint performance
        $this->updateEndpointMetrics($endpoint, $executionTime, $date, $hour);

        // Store overall performance
        $this->updateOverallMetrics($executionTime, $memoryUsageMB, $date, $hour);
    }

    /**
     * Update endpoint-specific metrics
     */
    protected function updateEndpointMetrics(string $endpoint, float $executionTime, string $date, string $hour): void
    {
        $key = "metrics:endpoint:{$endpoint}:{$date}:{$hour}";
        
        $metrics = Cache::get($key, [
            'count' => 0,
            'total_time' => 0,
            'avg_time' => 0,
            'min_time' => PHP_FLOAT_MAX,
            'max_time' => 0,
        ]);

        $metrics['count']++;
        $metrics['total_time'] += $executionTime;
        $metrics['avg_time'] = $metrics['total_time'] / $metrics['count'];
        $metrics['min_time'] = min($metrics['min_time'], $executionTime);
        $metrics['max_time'] = max($metrics['max_time'], $executionTime);

        Cache::put($key, $metrics, 86400); // Store for 24 hours
    }

    /**
     * Update overall performance metrics
     */
    protected function updateOverallMetrics(float $executionTime, float $memoryUsageMB, string $date, string $hour): void
    {
        $key = "metrics:overall:{$date}:{$hour}";
        
        $metrics = Cache::get($key, [
            'request_count' => 0,
            'total_execution_time' => 0,
            'avg_execution_time' => 0,
            'total_memory_usage' => 0,
            'avg_memory_usage' => 0,
            'max_execution_time' => 0,
            'max_memory_usage' => 0,
        ]);

        $metrics['request_count']++;
        $metrics['total_execution_time'] += $executionTime;
        $metrics['avg_execution_time'] = $metrics['total_execution_time'] / $metrics['request_count'];
        $metrics['total_memory_usage'] += $memoryUsageMB;
        $metrics['avg_memory_usage'] = $metrics['total_memory_usage'] / $metrics['request_count'];
        $metrics['max_execution_time'] = max($metrics['max_execution_time'], $executionTime);
        $metrics['max_memory_usage'] = max($metrics['max_memory_usage'], $memoryUsageMB);

        Cache::put($key, $metrics, 86400); // Store for 24 hours
    }

    /**
     * Get performance statistics
     */
    public static function getPerformanceStats(string $date = null): array
    {
        $date = $date ?? now()->format('Y-m-d');
        $stats = [];

        // Get overall stats for the day
        for ($hour = 0; $hour < 24; $hour++) {
            $key = "metrics:overall:{$date}:" . str_pad($hour, 2, '0', STR_PAD_LEFT);
            $hourStats = Cache::get($key);
            
            if ($hourStats) {
                $stats['hours'][$hour] = $hourStats;
            }
        }

        // Calculate daily totals
        $dailyStats = [
            'total_requests' => 0,
            'avg_execution_time' => 0,
            'avg_memory_usage' => 0,
            'max_execution_time' => 0,
            'max_memory_usage' => 0,
        ];

        $totalTime = 0;
        $totalMemory = 0;

        foreach ($stats['hours'] ?? [] as $hourStats) {
            $dailyStats['total_requests'] += $hourStats['request_count'];
            $totalTime += $hourStats['total_execution_time'];
            $totalMemory += $hourStats['total_memory_usage'];
            $dailyStats['max_execution_time'] = max($dailyStats['max_execution_time'], $hourStats['max_execution_time']);
            $dailyStats['max_memory_usage'] = max($dailyStats['max_memory_usage'], $hourStats['max_memory_usage']);
        }

        if ($dailyStats['total_requests'] > 0) {
            $dailyStats['avg_execution_time'] = $totalTime / $dailyStats['total_requests'];
            $dailyStats['avg_memory_usage'] = $totalMemory / $dailyStats['total_requests'];
        }

        $stats['daily'] = $dailyStats;

        return $stats;
    }

    /**
     * Get endpoint performance statistics
     */
    public static function getEndpointStats(string $endpoint, string $date = null): array
    {
        $date = $date ?? now()->format('Y-m-d');
        $stats = [];

        // Get endpoint stats for the day
        for ($hour = 0; $hour < 24; $hour++) {
            $key = "metrics:endpoint:{$endpoint}:{$date}:" . str_pad($hour, 2, '0', STR_PAD_LEFT);
            $hourStats = Cache::get($key);
            
            if ($hourStats) {
                $stats['hours'][$hour] = $hourStats;
            }
        }

        // Calculate daily totals
        $dailyStats = [
            'total_requests' => 0,
            'avg_execution_time' => 0,
            'min_execution_time' => PHP_FLOAT_MAX,
            'max_execution_time' => 0,
        ];

        $totalTime = 0;

        foreach ($stats['hours'] ?? [] as $hourStats) {
            $dailyStats['total_requests'] += $hourStats['count'];
            $totalTime += $hourStats['total_time'];
            $dailyStats['min_execution_time'] = min($dailyStats['min_execution_time'], $hourStats['min_time']);
            $dailyStats['max_execution_time'] = max($dailyStats['max_execution_time'], $hourStats['max_time']);
        }

        if ($dailyStats['total_requests'] > 0) {
            $dailyStats['avg_execution_time'] = $totalTime / $dailyStats['total_requests'];
        }

        if ($dailyStats['min_execution_time'] === PHP_FLOAT_MAX) {
            $dailyStats['min_execution_time'] = 0;
        }

        $stats['daily'] = $dailyStats;

        return $stats;
    }
} 