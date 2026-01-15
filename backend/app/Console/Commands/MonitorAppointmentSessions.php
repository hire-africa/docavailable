<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\AppointmentSessionMetrics;
use Illuminate\Support\Facades\Log;

/**
 * Monitor Appointment Session Conversion Metrics
 * 
 * Architecture:
 * - Checks backlog and error rate metrics
 * - Emits alerts if thresholds are exceeded
 * - Can be run manually or scheduled for monitoring
 */
class MonitorAppointmentSessions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'appointments:monitor-sessions 
                            {--alert : Emit alerts if thresholds exceeded}
                            {--json : Output metrics as JSON}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Monitor appointment-to-session conversion metrics and alert on thresholds';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $metrics = AppointmentSessionMetrics::getMetrics();
        
        // Check backlog alert
        $backlogAlert = AppointmentSessionMetrics::checkBacklogAlert(10, 50);
        
        // Check error rate alert
        $errorRateAlert = AppointmentSessionMetrics::checkErrorRateAlert(0.02, 0.10, 10);
        
        if ($this->option('json')) {
            $this->line(json_encode([
                'metrics' => $metrics,
                'backlog_alert' => $backlogAlert,
                'error_rate_alert' => $errorRateAlert,
            ], JSON_PRETTY_PRINT));
            return 0;
        }
        
        $this->info('📊 Appointment Session Conversion Metrics');
        $this->newLine();
        
        $this->line("Due Appointments: {$metrics['appointments_due_count']}");
        $this->line("Sessions Created (Total): {$metrics['appointment_sessions_created_total']}");
        $this->line("Conversions Failed (Total): {$metrics['appointment_session_conversion_failed_total']}");
        $this->line("Created (Last Minute): {$metrics['created_last_minute']}");
        $this->line("Failed (Last Minute): {$metrics['failed_last_minute']}");
        $this->newLine();
        
        // Backlog alert
        if ($backlogAlert['level'] !== 'ok') {
            $level = strtoupper($backlogAlert['level']);
            $this->{$backlogAlert['level'] === 'critical' ? 'error' : 'warn'}(
                "⚠️  BACKLOG ALERT ({$level}): {$backlogAlert['count']} appointments due"
            );
            
            if ($this->option('alert')) {
                Log::{$backlogAlert['level'] === 'critical' ? 'error' : 'warning'}('appointment_backlog_alert', [
                    'level' => $backlogAlert['level'],
                    'count' => $backlogAlert['count'],
                    'threshold' => $backlogAlert['level'] === 'critical' ? 50 : 10,
                ]);
            }
        } else {
            $this->info("✅ Backlog: OK ({$backlogAlert['count']} due)");
        }
        
        // Error rate alert
        if ($errorRateAlert['level'] !== 'ok') {
            $level = strtoupper($errorRateAlert['level']);
            $ratePercent = round($errorRateAlert['rate'] * 100, 2);
            $this->{$errorRateAlert['level'] === 'critical' ? 'error' : 'warn'}(
                "⚠️  ERROR RATE ALERT ({$level}): {$ratePercent}% failure rate ({$errorRateAlert['failed']}/{$errorRateAlert['attempted']})"
            );
            
            if ($this->option('alert')) {
                Log::{$errorRateAlert['level'] === 'critical' ? 'error' : 'warning'}('appointment_error_rate_alert', [
                    'level' => $errorRateAlert['level'],
                    'rate' => $errorRateAlert['rate'],
                    'attempted' => $errorRateAlert['attempted'],
                    'failed' => $errorRateAlert['failed'],
                ]);
            }
        } else {
            $ratePercent = round($errorRateAlert['rate'] * 100, 2);
            $this->info("✅ Error Rate: OK ({$ratePercent}%, {$errorRateAlert['attempted']} attempted)");
        }
        
        return 0;
    }
}
