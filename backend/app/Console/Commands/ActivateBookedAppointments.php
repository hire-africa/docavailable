<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Appointment;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class ActivateBookedAppointments extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'appointments:activate-booked';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Activate booked appointments when their scheduled time arrives';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Checking for appointments to activate...');

        // Find all confirmed appointments where scheduled time has arrived
        // Use UTC to match the DB field
        $now = Carbon::now('UTC');

        Log::info('🕐 [ActivateBookedAppointments] Checking at ' . $now->toDateTimeString());

        $appointmentsToActivate = Appointment::select([
            'id',
            'patient_id',
            'doctor_id',
            'appointment_date',
            'appointment_time',
            'appointment_datetime_utc',
            'status',
            'appointment_type'
        ])
            ->where('status', Appointment::STATUS_CONFIRMED)
            ->whereNotNull('appointment_datetime_utc')
            ->where('appointment_datetime_utc', '<=', $now)
            ->get();

        if ($appointmentsToActivate->isEmpty()) {
            $this->info('No appointments to activate.');
            return Command::SUCCESS;
        }

        $this->info("Found {$appointmentsToActivate->count()} appointment(s) to activate.");

        $activated = 0;
        $failed = 0;

        foreach ($appointmentsToActivate as $appointment) {
            try {
                $this->activateAppointment($appointment);
                $activated++;
            } catch (\Exception $e) {
                Log::error("Failed to activate appointment", [
                    'appointment_id' => $appointment->id,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                $this->error("Failed to activate appointment {$appointment->id}: {$e->getMessage()}");
                $failed++;
            }
        }

        $this->info("Activated {$activated} appointment(s). Failed: {$failed}");

        return Command::SUCCESS;
    }

    /**
     * Activate a single appointment
     */
    private function activateAppointment(Appointment $appointment): void
    {
        // Update appointment status to in_progress
        $appointment->update([
            'status' => Appointment::STATUS_IN_PROGRESS,
            'actual_start_time' => now(),
        ]);

        Log::info("Activated booked appointment", [
            'appointment_id' => $appointment->id,
            'patient_id' => $appointment->patient_id,
            'doctor_id' => $appointment->doctor_id,
            'appointment_type' => $appointment->appointment_type,
            'activated_at' => now()->toDateTimeString()
        ]);

        $this->info("✅ Activated appointment {$appointment->id}");

        // Send notifications to both parties
        $this->sendActivationNotifications($appointment);
    }

    /**
     * Send push notifications to patient and doctor
     */
    private function sendActivationNotifications(Appointment $appointment): void
    {
        try {
            $patient = $appointment->patient;
            $doctor = $appointment->doctor;

            if (!$patient || !$doctor) {
                Log::warning("Cannot send activation notifications - missing patient or doctor", [
                    'appointment_id' => $appointment->id,
                    'has_patient' => !!$patient,
                    'has_doctor' => !!$doctor
                ]);
                return;
            }

            $appointmentTypeDisplay = match ($appointment->appointment_type) {
                'audio', 'voice' => 'voice call',
                'video' => 'video call',
                default => 'text session'
            };

            // Send notification to patient
            if ($patient->push_token && $patient->push_notifications_enabled) {
                try {
                    $patient->notify(new \App\Notifications\AppointmentActivated(
                        $appointment,
                        "Dr. {$doctor->first_name} {$doctor->last_name}",
                        $appointmentTypeDisplay,
                        'patient'
                    ));
                    $this->info("   📱 Notification sent to patient {$patient->id}");
                } catch (\Exception $e) {
                    Log::warning("Failed to send patient notification", [
                        'appointment_id' => $appointment->id,
                        'patient_id' => $patient->id,
                        'error' => $e->getMessage()
                    ]);
                }
            }

            // Send notification to doctor
            if ($doctor->push_token && $doctor->push_notifications_enabled) {
                try {
                    $doctor->notify(new \App\Notifications\AppointmentActivated(
                        $appointment,
                        "{$patient->first_name} {$patient->last_name}",
                        $appointmentTypeDisplay,
                        'doctor'
                    ));
                    $this->info("   📱 Notification sent to doctor {$doctor->id}");
                } catch (\Exception $e) {
                    Log::warning("Failed to send doctor notification", [
                        'appointment_id' => $appointment->id,
                        'doctor_id' => $doctor->id,
                        'error' => $e->getMessage()
                    ]);
                }
            }
        } catch (\Exception $e) {
            Log::error("Error sending activation notifications", [
                'appointment_id' => $appointment->id,
                'error' => $e->getMessage()
            ]);
        }
    }
}
