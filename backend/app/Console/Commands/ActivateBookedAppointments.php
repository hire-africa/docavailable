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

        // Fetch all confirmed appointments and filter using TimezoneService for maximum resilience
        $allConfirmed = Appointment::where('status', Appointment::STATUS_CONFIRMED)->get();

        $appointmentsToActivate = $allConfirmed->filter(function ($appointment) {
            $reached = \App\Services\TimezoneService::isAppointmentTimeReached(
                $appointment->appointment_date,
                $appointment->appointment_time,
                $appointment->user_timezone ?? 'Africa/Blantyre'
            );

            if ($reached) {
                Log::info("🎯 [ActivateBookedAppointments] Appointment {$appointment->id} is ready for activation", [
                    'date' => $appointment->appointment_date,
                    'time' => $appointment->appointment_time,
                    'tz' => $appointment->user_timezone
                ]);
            }

            return $reached;
        });


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
        $this->info("   Activating appointment {$appointment->id} ({$appointment->appointment_type})");

        // Note: No upfront billing here. Billing is deferred to auto-deduction (duration-based)
        // or manual session end (base fee), matching the instant session model.

        // For text appointments, we need to create the associated TextSession and ChatRoom
        // This ensures the "Active Session" banner appears on the frontend and chat works
        if ($appointment->appointment_type === 'text') {
            $this->activateTextSession($appointment);
        } else {
            // Standard activation for other types (audio/video)
            $appointment->update([
                'status' => Appointment::STATUS_IN_PROGRESS, // 7
                'actual_start_time' => now(),
            ]);
        }

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
     * Activate a text session
     */
    private function activateTextSession(Appointment $appointment): void
    {
        try {
            // Fetch subscription to get context for TextSession record
            $subscription = \App\Models\Subscription::where('user_id', $appointment->patient_id)
                ->where('is_active', true)
                ->first();

            \Illuminate\Support\Facades\DB::transaction(function () use ($appointment, $subscription) {
                // Check if session already exists
                $existingSession = \App\Models\TextSession::where('appointment_id', $appointment->id)->first();

                if ($existingSession) {
                    $this->info("      Text session already exists for appointment {$appointment->id}");
                    $session = $existingSession;

                    // Ensure status is correct if it was just scheduled
                    if ($session->status === 'scheduled') {
                        $session->update([
                            'status' => 'waiting_for_doctor',
                            'started_at' => now(),
                            'activated_at' => now(),
                            'doctor_response_deadline' => now()->addSeconds(90),
                            'sessions_used' => 0 // Reverted to 0: billing is deferred
                        ]);
                    }
                } else {
                    // Create new TextSession
                    // NO UPFRONT DEDUCTION: sessions_used starts at 0
                    $session = \App\Models\TextSession::create([
                        'appointment_id' => $appointment->id,
                        'patient_id' => $appointment->patient_id,
                        'doctor_id' => $appointment->doctor_id,
                        'status' => 'waiting_for_doctor', // Initial status
                        'sessions_remaining_before_start' => $subscription ? $subscription->text_sessions_remaining : 0,
                        'doctor_response_deadline' => now()->addSeconds(90),
                        'started_at' => now(),
                        'activated_at' => now(), // Important for auto-deduction timer
                        'last_activity_at' => now(),
                        'created_at' => now(),
                        'updated_at' => now(),
                        'sessions_used' => 0 // Explicitly 0, billing happens later
                    ]);

                    $this->info("   Created text session {$session->id}");
                }

                // Create Chat Room if needed
                if (!$session->chat_id) {
                    $chatRoomName = "text_session_{$session->id}";

                    // Check if room exists by name first
                    $existingRoom = \Illuminate\Support\Facades\DB::table('chat_rooms')
                        ->where('name', $chatRoomName)
                        ->where('type', 'text_session')
                        ->first();

                    if ($existingRoom) {
                        $roomId = $existingRoom->id;
                    } else {
                        $roomId = \Illuminate\Support\Facades\DB::table('chat_rooms')->insertGetId([
                            'name' => $chatRoomName,
                            'type' => 'text_session',
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }

                    $session->update(['chat_id' => $roomId]);

                    // Add Participants
                    // Use insertOrIgnore to prevent duplicates
                    \Illuminate\Support\Facades\DB::table('chat_room_participants')->insertOrIgnore([
                        [
                            'chat_room_id' => $roomId,
                            'user_id' => $appointment->patient_id,
                            'role' => 'member',
                            'created_at' => now(),
                            'updated_at' => now()
                        ],
                        [
                            'chat_room_id' => $roomId,
                            'user_id' => $appointment->doctor_id,
                            'role' => 'member',
                            'created_at' => now(),
                            'updated_at' => now()
                        ]
                    ]);

                    $this->info("   Created/Linked chat room {$roomId}");
                }

                // Finally update appointment status
                $appointment->update([
                    'status' => Appointment::STATUS_IN_PROGRESS, // 7
                    'actual_start_time' => now(),
                ]);
            });

        } catch (\Exception $e) {
            Log::error("Failed to activate text session infrastructure", [
                'appointment_id' => $appointment->id,
                'error' => $e->getMessage()
            ]);
            // Throw to be caught by main loop
            throw $e;
        }
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
