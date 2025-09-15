<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Middleware\PerformanceMonitor;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class PerformanceController extends Controller
{
    /**
     * Get overall performance statistics
     */
    public function getOverallStats(Request $request): JsonResponse
    {
        $date = $request->get('date', now()->format('Y-m-d'));
        $stats = PerformanceMonitor::getPerformanceStats($date);

        return response()->json([
            'success' => true,
            'date' => $date,
            'stats' => $stats
        ]);
    }

    /**
     * Get endpoint performance statistics
     */
    public function getEndpointStats(Request $request): JsonResponse
    {
        $endpoint = $request->get('endpoint');
        $date = $request->get('date', now()->format('Y-m-d'));

        if (!$endpoint) {
            return response()->json([
                'success' => false,
                'message' => 'Endpoint parameter is required'
            ], 400);
        }

        $stats = PerformanceMonitor::getEndpointStats($endpoint, $date);

        return response()->json([
            'success' => true,
            'endpoint' => $endpoint,
            'date' => $date,
            'stats' => $stats
        ]);
    }

    /**
     * Get slowest endpoints
     */
    public function getSlowestEndpoints(Request $request): JsonResponse
    {
        $date = $request->get('date', now()->format('Y-m-d'));
        $limit = $request->get('limit', 10);

        $slowestEndpoints = [];
        
        // Get all endpoint keys for the date
        $pattern = "metrics:endpoint:*:{$date}:*";
        $keys = Cache::get('performance_keys', []);
        
        $endpointStats = [];
        
        foreach ($keys as $key) {
            if (preg_match('/metrics:endpoint:(.+):(\d{4}-\d{2}-\d{2}):(\d{2})/', $key, $matches)) {
                $endpoint = $matches[1];
                $endpointDate = $matches[2];
                $hour = $matches[3];
                
                if ($endpointDate === $date) {
                    $stats = Cache::get($key);
                    if ($stats) {
                        if (!isset($endpointStats[$endpoint])) {
                            $endpointStats[$endpoint] = [
                                'total_requests' => 0,
                                'total_time' => 0,
                                'avg_time' => 0,
                                'max_time' => 0,
                                'min_time' => PHP_FLOAT_MAX,
                            ];
                        }
                        
                        $endpointStats[$endpoint]['total_requests'] += $stats['count'];
                        $endpointStats[$endpoint]['total_time'] += $stats['total_time'];
                        $endpointStats[$endpoint]['max_time'] = max($endpointStats[$endpoint]['max_time'], $stats['max_time']);
                        $endpointStats[$endpoint]['min_time'] = min($endpointStats[$endpoint]['min_time'], $stats['min_time']);
                    }
                }
            }
        }

        // Calculate averages and sort by average time
        foreach ($endpointStats as $endpoint => $stats) {
            if ($stats['total_requests'] > 0) {
                $endpointStats[$endpoint]['avg_time'] = $stats['total_time'] / $stats['total_requests'];
            }
            if ($endpointStats[$endpoint]['min_time'] === PHP_FLOAT_MAX) {
                $endpointStats[$endpoint]['min_time'] = 0;
            }
        }

        // Sort by average execution time (descending)
        uasort($endpointStats, function ($a, $b) {
            return $b['avg_time'] <=> $a['avg_time'];
        });

        // Take top N slowest endpoints
        $slowestEndpoints = array_slice($endpointStats, 0, $limit, true);

        return response()->json([
            'success' => true,
            'date' => $date,
            'slowest_endpoints' => $slowestEndpoints
        ]);
    }

    /**
     * Get cache statistics
     */
    public function getCacheStats(): JsonResponse
    {
        $cacheStats = [
            'driver' => config('cache.default'),
            'prefix' => config('cache.prefix'),
            'stores' => []
        ];

        // Get cache store statistics
        $stores = ['file', 'redis', 'database'];
        
        foreach ($stores as $store) {
            if (config("cache.stores.{$store}")) {
                try {
                    $storeInstance = Cache::store($store);
                    $cacheStats['stores'][$store] = [
                        'available' => true,
                        'connection' => config("cache.stores.{$store}.connection") ?? 'default'
                    ];
                } catch (\Exception $e) {
                    $cacheStats['stores'][$store] = [
                        'available' => false,
                        'error' => $e->getMessage()
                    ];
                }
            }
        }

        return response()->json([
            'success' => true,
            'cache_stats' => $cacheStats
        ]);
    }

    /**
     * Get database performance statistics
     */
    public function getDatabaseStats(): JsonResponse
    {
        try {
            $dbStats = [
                'connection' => config('database.default'),
                'slow_queries' => [],
                'table_sizes' => [],
                'connection_status' => 'connected'
            ];

            // Get slow query log (if enabled)
            if (config('database.connections.mysql.log_queries', false)) {
                $slowQueries = DB::select("
                    SELECT 
                        sql_text,
                        COUNT(*) as execution_count,
                        AVG(duration) as avg_duration,
                        MAX(duration) as max_duration,
                        SUM(duration) as total_duration
                    FROM mysql.slow_log 
                    WHERE start_time >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                    GROUP BY sql_text
                    ORDER BY avg_duration DESC
                    LIMIT 10
                ");
                
                $dbStats['slow_queries'] = $slowQueries;
            }

            // Get table sizes
            $tableSizes = DB::select("
                SELECT 
                    table_name,
                    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'size_mb',
                    table_rows
                FROM information_schema.tables 
                WHERE table_schema = DATABASE()
                ORDER BY (data_length + index_length) DESC
            ");
            
            $dbStats['table_sizes'] = $tableSizes;

        } catch (\Exception $e) {
            $dbStats = [
                'connection' => config('database.default'),
                'connection_status' => 'error',
                'error' => $e->getMessage()
            ];
        }

        return response()->json([
            'success' => true,
            'database_stats' => $dbStats
        ]);
    }

    /**
     * Clear performance cache
     */
    public function clearPerformanceCache(): JsonResponse
    {
        try {
            // Clear performance-related cache keys
            $pattern = 'metrics:*';
            $keys = Cache::get('performance_keys', []);
            
            foreach ($keys as $key) {
                if (str_starts_with($key, 'metrics:')) {
                    Cache::forget($key);
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Performance cache cleared successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to clear performance cache: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get system resource usage
     */
    public function getSystemStats(): JsonResponse
    {
        $systemStats = [
            'memory' => [
                'total' => ini_get('memory_limit'),
                'used' => memory_get_usage(true),
                'peak' => memory_get_peak_usage(true),
                'free' => ini_get('memory_limit') - memory_get_usage(true)
            ],
            'disk' => [
                'total' => disk_total_space(storage_path()),
                'free' => disk_free_space(storage_path()),
                'used' => disk_total_space(storage_path()) - disk_free_space(storage_path())
            ],
            'php' => [
                'version' => PHP_VERSION,
                'max_execution_time' => ini_get('max_execution_time'),
                'upload_max_filesize' => ini_get('upload_max_filesize'),
                'post_max_size' => ini_get('post_max_size')
            ],
            'laravel' => [
                'version' => app()->version(),
                'environment' => config('app.env'),
                'debug' => config('app.debug'),
                'timezone' => config('app.timezone')
            ]
        ];

        return response()->json([
            'success' => true,
            'system_stats' => $systemStats
        ]);
    }

    /**
     * Get queue statistics
     */
    public function getQueueStats(): JsonResponse
    {
        try {
            $queueStats = [
                'driver' => config('queue.default'),
                'connections' => []
            ];

            // Get queue connection statistics
            $connections = ['sync', 'database', 'redis'];
            
            foreach ($connections as $connection) {
                if (config("queue.connections.{$connection}")) {
                    $queueStats['connections'][$connection] = [
                        'available' => true,
                        'queue' => config("queue.connections.{$connection}.queue") ?? 'default'
                    ];
                }
            }

            // Get database queue statistics if using database driver
            if (config('queue.default') === 'database') {
                $pendingJobs = DB::table('jobs')->count();
                $failedJobs = DB::table('failed_jobs')->count();
                
                $queueStats['database'] = [
                    'pending_jobs' => $pendingJobs,
                    'failed_jobs' => $failedJobs
                ];
            }

        } catch (\Exception $e) {
            $queueStats = [
                'driver' => config('queue.default'),
                'error' => $e->getMessage()
            ];
        }

        return response()->json([
            'success' => true,
            'queue_stats' => $queueStats
        ]);
    }
} 