<?php

namespace App\Services;

use App\Models\Appointment;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

/**
 * Appointment Session Metrics Service
 * 
 * Tracks metrics for appointment-to-session conversion:
 * - appointments_due_count (gauge)
 * - appointment_sessions_created_total (counter)
 * - appointment_session_conversion_failed_total (counter)
 */
class AppointmentSessionMetrics
{
    /**
     * Get count of confirmed appointments due for session creation
     * 
     * Definition: status=CONFIRMED, session_id IS NULL, appointment_datetime_utc <= now_utc()
     * 
     * @return int
     */
    public static function getDueAppointmentsCount(): int
    {
        $now = Carbon::now('UTC');
        
        return Appointment::where('status', Appointment::STATUS_CONFIRMED)
            ->whereNull('session_id')
            ->where('appointment_datetime_utc', '<=', $now)
            ->count();
    }

    /**
     * Record appointment session created metric
     * 
     * @param int $appointmentId
     * @param int $sessionId
     * @param string $modality 'text' | 'call'
     */
    public static function recordSessionCreated(int $appointmentId, int $sessionId, string $modality): void
    {
        // Increment counter (no expiration for total counter)
        $key = "metrics:appointment_sessions_created_total";
        Cache::increment($key);
        
        // Store per-minute rate for monitoring (with TTL)
        $minuteKey = "metrics:appointment_sessions_created:minute:" . now()->format('Y-m-d-H-i');
        $currentValue = Cache::get($minuteKey, 0);
        Cache::put($minuteKey, $currentValue + 1, now()->addMinutes(2)); // TTL 2 minutes
        
        Log::info('appointment_session_created', [
            'metric' => 'appointment_sessions_created_total',
            'appointment_id' => $appointmentId,
            'session_id' => $sessionId,
            'modality' => $modality,
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    /**
     * Record appointment session conversion failure metric
     * 
     * @param int $appointmentId
     * @param string $reason Failure category (see failure categories)
     * @param string|null $errorMessage Optional error message
     */
    public static function recordConversionFailed(int $appointmentId, string $reason, ?string $errorMessage = null): void
    {
        // Increment counter with reason tag (no expiration for counters)
        $key = "metrics:appointment_session_conversion_failed_total:reason:{$reason}";
        Cache::increment($key);
        
        // Also increment total
        $totalKey = "metrics:appointment_session_conversion_failed_total";
        Cache::increment($totalKey);
        
        // Store per-minute rate for monitoring (with TTL)
        $minuteKey = "metrics:appointment_session_conversion_failed:minute:" . now()->format('Y-m-d-H-i');
        $currentValue = Cache::get($minuteKey, 0);
        Cache::put($minuteKey, $currentValue + 1, now()->addMinutes(2)); // TTL 2 minutes
        
        Log::warning('appointment_session_conversion_failed', [
            'metric' => 'appointment_session_conversion_failed_total',
            'appointment_id' => $appointmentId,
            'reason' => $reason,
            'error_message' => $errorMessage,
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    /**
     * Get metrics for monitoring/alerting
     * 
     * @return array
     */
    public static function getMetrics(): array
    {
        $now = Carbon::now('UTC');
        
        return [
            'appointments_due_count' => self::getDueAppointmentsCount(),
            'appointment_sessions_created_total' => (int) Cache::get('metrics:appointment_sessions_created_total', 0),
            'appointment_session_conversion_failed_total' => (int) Cache::get('metrics:appointment_session_conversion_failed_total', 0),
            'created_last_minute' => (int) Cache::get("metrics:appointment_sessions_created:minute:" . now()->format('Y-m-d-H-i'), 0),
            'failed_last_minute' => (int) Cache::get("metrics:appointment_session_conversion_failed:minute:" . now()->format('Y-m-d-H-i'), 0),
            'timestamp' => $now->toIso8601String(),
        ];
    }

    /**
     * Check if backlog alert thresholds are exceeded
     * 
     * @param int $warningThreshold Warning threshold (default: 10)
     * @param int $criticalThreshold Critical threshold (default: 50)
     * @return array ['level' => 'ok'|'warning'|'critical', 'count' => int]
     */
    public static function checkBacklogAlert(int $warningThreshold = 10, int $criticalThreshold = 50): array
    {
        $dueCount = self::getDueAppointmentsCount();
        
        if ($dueCount >= $criticalThreshold) {
            return ['level' => 'critical', 'count' => $dueCount];
        } elseif ($dueCount >= $warningThreshold) {
            return ['level' => 'warning', 'count' => $dueCount];
        }
        
        return ['level' => 'ok', 'count' => $dueCount];
    }

    /**
     * Check if error rate alert thresholds are exceeded
     * 
     * @param float $warningThreshold Warning threshold (default: 0.02 = 2%)
     * @param float $criticalThreshold Critical threshold (default: 0.10 = 10%)
     * @param int $windowMinutes Time window in minutes (default: 10)
     * @return array ['level' => 'ok'|'warning'|'critical', 'rate' => float, 'attempted' => int, 'failed' => int]
     */
    public static function checkErrorRateAlert(float $warningThreshold = 0.02, float $criticalThreshold = 0.10, int $windowMinutes = 10): array
    {
        $now = Carbon::now();
        $attempted = 0;
        $failed = 0;
        
        // Sum up metrics over the time window
        // attempted = created + failed (total attempts)
        // failed = failed (just failures)
        for ($i = 0; $i < $windowMinutes; $i++) {
            $minute = $now->copy()->subMinutes($i);
            $minuteKey = $minute->format('Y-m-d-H-i');
            
            $created = (int) Cache::get("metrics:appointment_sessions_created:minute:{$minuteKey}", 0);
            $failedCount = (int) Cache::get("metrics:appointment_session_conversion_failed:minute:{$minuteKey}", 0);
            
            $attempted += $created + $failedCount; // Total attempts = created + failed
            $failed += $failedCount; // Just failures
        }
        
        if ($attempted === 0) {
            return ['level' => 'ok', 'rate' => 0.0, 'attempted' => 0, 'failed' => 0];
        }
        
        $rate = $failed / $attempted;
        
        if ($rate >= $criticalThreshold) {
            return ['level' => 'critical', 'rate' => $rate, 'attempted' => $attempted, 'failed' => $failed];
        } elseif ($rate >= $warningThreshold) {
            return ['level' => 'warning', 'rate' => $rate, 'attempted' => $attempted, 'failed' => $failed];
        }
        
        return ['level' => 'ok', 'rate' => $rate, 'attempted' => $attempted, 'failed' => $failed];
    }
}
