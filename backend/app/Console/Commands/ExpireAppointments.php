<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Appointment;
use Carbon\Carbon;

class ExpireAppointments extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'appointments:expire';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Expire appointments that are past their scheduled time';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting appointment expiration check...');

        $now = Carbon::now();
        
        // FIX: Find pending appointments that are past their scheduled time OR have been pending for more than 24 hours
        $expiredAppointments = Appointment::where('status', Appointment::STATUS_PENDING)
            ->where(function ($query) use ($now) {
                // Past scheduled time
                $query->where(function ($q) use ($now) {
                    $q->whereNotNull('appointment_datetime_utc')
                      ->where('appointment_datetime_utc', '<', $now);
                })
                // OR old format check for backward compatibility
                ->orWhere(function ($q) use ($now) {
                    $q->whereNull('appointment_datetime_utc')
                      ->where('appointment_date', '<', $now->format('Y-m-d'))
                      ->orWhere(function ($subQ) use ($now) {
                          $subQ->where('appointment_date', '=', $now->format('Y-m-d'))
                               ->where('appointment_time', '<', $now->format('H:i:s'));
                      });
                })
                // OR pending for more than 24 hours
                ->orWhere('created_at', '<', $now->subHours(24));
            })
            ->get();

        $count = $expiredAppointments->count();
        
        if ($count === 0) {
            $this->info('No expired appointments found.');
            return;
        }

        $this->info("Found {$count} expired appointment(s).");

        $expiredCount = 0;
        $notifiedCount = 0;

        foreach ($expiredAppointments as $appointment) {
            try {
                $expiredReason = '';
                
                // Determine expiration reason
                if ($appointment->appointment_datetime_utc && $appointment->appointment_datetime_utc < $now) {
                    $expiredReason = 'Appointment time has passed';
                } elseif ($appointment->created_at < $now->subHours(24)) {
                    $expiredReason = 'No doctor response within 24 hours';
                } else {
                    $expiredReason = 'Appointment time has passed (legacy format)';
                }

                $appointment->update([
                    'status' => Appointment::STATUS_CANCELLED,
                    'cancellation_reason' => "Automatically expired - {$expiredReason}",
                    'cancelled_by' => 'system',
                    'cancelled_at' => $now
                ]);

                // Notify patient about expiration
                try {
                    if ($appointment->patient) {
                        $appointment->patient->notify(new \App\Notifications\AppointmentExpiredNotification($appointment, $expiredReason));
                        $notifiedCount++;
                    }
                } catch (\Exception $e) {
                    \Log::warning('Failed to send appointment expiration notification', [
                        'appointment_id' => $appointment->id,
                        'patient_id' => $appointment->patient_id,
                        'error' => $e->getMessage()
                    ]);
                }

                $expiredCount++;
                $this->line("Expired appointment ID: {$appointment->id} - Reason: {$expiredReason}");
                
                \Log::info('Appointment expired automatically', [
                    'appointment_id' => $appointment->id,
                    'patient_id' => $appointment->patient_id,
                    'doctor_id' => $appointment->doctor_id,
                    'reason' => $expiredReason,
                    'scheduled_time' => $appointment->appointment_datetime_utc ?? "{$appointment->appointment_date} {$appointment->appointment_time}",
                ]);
                
            } catch (\Exception $e) {
                $this->error("Error expiring appointment {$appointment->id}: " . $e->getMessage());
                \Log::error('Error expiring appointment', [
                    'appointment_id' => $appointment->id,
                    'error' => $e->getMessage()
                ]);
            }
        }

        $this->info("Appointment expiration completed. Expired: {$expiredCount}, Notifications sent: {$notifiedCount}");
        
        if ($expiredCount > 0) {
            \Log::info('Appointment expiration batch completed', [
                'expired_count' => $expiredCount,
                'notifications_sent' => $notifiedCount
            ]);
        }
    }
} 