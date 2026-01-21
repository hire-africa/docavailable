<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Appointment;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

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
        // ⚠️ GUARDRAIL: Check feature flag to disable legacy triggers
        $featureFlagDisabled = \App\Services\FeatureFlags::disableLegacyAppointmentTriggers();
        if ($featureFlagDisabled) {
            $this->info('Legacy appointment triggers disabled via feature flag. Skipping...');
            Log::warning('🚫 [ActivateBookedAppointments] BLOCKED by feature flag DISABLE_LEGACY_APPOINTMENT_TRIGGERS');
            return Command::SUCCESS;
        }

        $this->info('Checking for appointments to activate...');

        // Find all confirmed appointments where scheduled time has arrived
        // Use UTC to match the DB field
        $now = Carbon::now('UTC');

        Log::info('🕐 [ActivateBookedAppointments] Checking at ' . $now->toDateTimeString());

        // Fetch all confirmed appointments and filter using TimezoneService for maximum resilience
        // ⚠️ GUARDRAIL: Skip appointments that already have session_id (handled by auto-start job)
        $allConfirmed = Appointment::where('status', Appointment::STATUS_CONFIRMED)
            ->whereNull('session_id') // Only process appointments without session_id
            ->get();

        Log::info("📋 [ActivateBookedAppointments] Found {$allConfirmed->count()} confirmed appointment(s) without session_id");

        $appointmentsToActivate = $allConfirmed->filter(function ($appointment) use ($now) {
            $reached = \App\Services\TimezoneService::isAppointmentTimeReached(
                $appointment->appointment_date,
                $appointment->appointment_time,
                $appointment->user_timezone ?? 'Africa/Blantyre'
            );

            if ($reached) {
                Log::info("🎯 [ActivateBookedAppointments] Appointment {$appointment->id} is ready for activation", [
                    'date' => $appointment->appointment_date,
                    'time' => $appointment->appointment_time,
                    'tz' => $appointment->user_timezone,
                    'type' => $appointment->appointment_type
                ]);
            } else {
                // Log why appointment is not ready (for debugging)
                try {
                    $appointmentDateTime = \App\Services\TimezoneService::convertToUTC(
                        $appointment->appointment_date,
                        $appointment->appointment_time,
                        $appointment->user_timezone ?? 'Africa/Blantyre'
                    );
                    if ($appointmentDateTime) {
                        $diffMinutes = $now->diffInMinutes($appointmentDateTime, false);
                        Log::debug("⏳ [ActivateBookedAppointments] Appointment {$appointment->id} not ready yet", [
                            'appointment_utc' => $appointmentDateTime->toDateTimeString(),
                            'current_utc' => $now->toDateTimeString(),
                            'minutes_until' => $diffMinutes > 0 ? $diffMinutes : -$diffMinutes,
                            'status' => $diffMinutes > 0 ? 'future' : 'past'
                        ]);
                    }
                } catch (\Exception $e) {
                    Log::warning("⚠️ [ActivateBookedAppointments] Could not calculate time for appointment {$appointment->id}", [
                        'error' => $e->getMessage()
                    ]);
                }
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
            // For audio/video appointments, create appointment chat room when time arrives
            // This allows users to see the chat interface with call button
            if (in_array($appointment->appointment_type, ['audio', 'voice', 'video'])) {
                // CRITICAL: Chat room must be created - throw if it fails
                $this->activateCallAppointmentChat($appointment);
            }
            
            // Calls must not be auto-started. Only unlock them when eligible.
            // Set call_unlocked_at to the appointment time (or now if appointment time is in the past)
            // Check if column exists before updating (migration may not have run)
            if (\Illuminate\Support\Facades\Schema::hasColumn('appointments', 'call_unlocked_at')) {
                if (!$appointment->call_unlocked_at) {
                    // Get appointment UTC time
                    $appointmentUTC = null;
                    if ($appointment->appointment_datetime_utc) {
                        $appointmentUTC = \Carbon\Carbon::parse($appointment->appointment_datetime_utc);
                    } else {
                        // Fallback: calculate from date/time/timezone
                        $appointmentUTC = \App\Services\TimezoneService::convertToUTC(
                            $appointment->appointment_date,
                            $appointment->appointment_time,
                            $appointment->user_timezone ?? 'Africa/Blantyre'
                        );
                    }
                    
                    // Set to appointment time (or 5 minutes before for buffer), but not in the future
                    // This ensures call_unlocked_at reflects when the appointment should be unlocked
                    if ($appointmentUTC) {
                        // Unlock 5 minutes before appointment time (buffer)
                        $unlockTime = $appointmentUTC->copy()->subMinutes(5);
                        // But don't set it in the future - use now() if unlock time hasn't arrived yet
                        if ($unlockTime->gt(now())) {
                            $unlockTime = now();
                        }
                    } else {
                        // Fallback: use current time if we can't calculate appointment time
                        $unlockTime = now();
                    }
                    
                    $appointment->update([
                        'call_unlocked_at' => $unlockTime,
                    ]);
                    
                    // Clear cache for this user's appointments to ensure fresh data
                    $patientCacheKey = "user_appointments_{$appointment->patient_id}_patient_*";
                    $doctorCacheKey = "user_appointments_{$appointment->doctor_id}_doctor_*";
                    \Illuminate\Support\Facades\Cache::flush(); // Clear all cache (simple approach)
                    // Alternatively, could use Cache::tags() for more granular clearing
                    
                    Log::info("Set call_unlocked_at for appointment", [
                        'appointment_id' => $appointment->id,
                        'call_unlocked_at' => $unlockTime->toDateTimeString(),
                        'appointment_utc' => $appointmentUTC ? $appointmentUTC->toDateTimeString() : 'null'
                    ]);
                }
            } else {
                Log::warning("call_unlocked_at column does not exist in appointments table. Migration may need to be run.");
            }
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

            $windowSeconds = (int) config('app.text_session_response_window', 300);

            \Illuminate\Support\Facades\DB::transaction(function () use ($appointment, $subscription, $windowSeconds) {
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
                            'doctor_response_deadline' => null, // Set to null initially - will be set when patient sends first message
                            'sessions_used' => 0 // Reverted to 0: billing is deferred
                        ]);
                    }
                    
                    // ⚠️ CRITICAL: Populate appointments.session_id to link appointment to session
                    // This ensures frontend can resolve session context and prevents duplicate session creation
                    if (!$appointment->session_id) {
                        $appointment->update(['session_id' => $session->id]);
                        $this->info("      Linked appointment {$appointment->id} to existing session {$session->id}");
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
                        'doctor_response_deadline' => null, // Set to null initially - will be set when patient sends first message
                        'started_at' => now(),
                        'last_activity_at' => now(),
                        'created_at' => now(),
                        'updated_at' => now(),
                        'sessions_used' => 0 // Explicitly 0, billing happens later
                    ]);

                    $this->info("   Created text session {$session->id}");
                    
                    // ⚠️ CRITICAL: Populate appointments.session_id to link appointment to session
                    // This ensures frontend can resolve session context and prevents duplicate session creation
                    $appointment->update(['session_id' => $session->id]);
                    $this->info("      Linked appointment {$appointment->id} to session {$session->id}");
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
     * Activate appointment chat for audio/video appointments
     * Creates a chat room where users can initiate calls
     */
    private function activateCallAppointmentChat(Appointment $appointment): void
    {
        // CRITICAL: Chat room creation is essential - retry if it fails
        $maxRetries = 3;
        $attempt = 0;
        $lastError = null;

        while ($attempt < $maxRetries) {
            $attempt++;
            try {
                \Illuminate\Support\Facades\DB::transaction(function () use ($appointment) {
                    // Check if chat room already exists for this appointment
                    $chatRoomName = "appointment_{$appointment->id}";
                    $existingRoom = \Illuminate\Support\Facades\DB::table('chat_rooms')
                        ->where('name', $chatRoomName)
                        ->where('type', 'private') // Use 'private' type (appointment_chat is not in enum)
                        ->first();

                    if ($existingRoom) {
                        $this->info("   Appointment chat room already exists for appointment {$appointment->id}");
                        Log::info("Appointment chat room already exists", [
                            'appointment_id' => $appointment->id,
                            'chat_room_id' => $existingRoom->id
                        ]);
                        return;
                    }

                    // Validate required fields
                    if (!$appointment->patient_id || !$appointment->doctor_id) {
                        throw new \Exception("Missing patient_id or doctor_id for appointment {$appointment->id}");
                    }

                    // Create appointment chat room (use 'private' type since appointment_chat is not in enum)
                    $roomId = \Illuminate\Support\Facades\DB::table('chat_rooms')->insertGetId([
                        'name' => $chatRoomName,
                        'type' => 'private', // Changed from 'appointment_chat' to 'private'
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    $this->info("   Created appointment chat room {$roomId} for appointment {$appointment->id}");
                    Log::info("Created appointment chat room", [
                        'appointment_id' => $appointment->id,
                        'chat_room_id' => $roomId,
                        'chat_room_name' => $chatRoomName
                    ]);

                    // Add participants (patient and doctor) - insert separately to catch individual errors
                    $participants = [
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
                    ];

                    $participantsAdded = 0;
                    foreach ($participants as $participant) {
                        try {
                            \Illuminate\Support\Facades\DB::table('chat_room_participants')->insertOrIgnore($participant);
                            $participantsAdded++;
                            Log::debug("Added participant to appointment chat room", [
                                'appointment_id' => $appointment->id,
                                'chat_room_id' => $roomId,
                                'user_id' => $participant['user_id']
                            ]);
                        } catch (\Exception $e) {
                            Log::warning("Failed to add participant to appointment chat room", [
                                'appointment_id' => $appointment->id,
                                'chat_room_id' => $roomId,
                                'user_id' => $participant['user_id'],
                                'error' => $e->getMessage()
                            ]);
                            // Continue with other participant
                        }
                    }

                    if ($participantsAdded === 0) {
                        throw new \Exception("Failed to add any participants to chat room {$roomId}");
                    }

                    $this->info("   Added {$participantsAdded} participant(s) to appointment chat room {$roomId}");
                });

                // Success - break out of retry loop
                return;

            } catch (\Exception $e) {
                $lastError = $e;
                Log::warning("Attempt {$attempt}/{$maxRetries} failed to activate appointment chat", [
                    'appointment_id' => $appointment->id,
                    'appointment_type' => $appointment->appointment_type,
                    'patient_id' => $appointment->patient_id,
                    'doctor_id' => $appointment->doctor_id,
                    'error' => $e->getMessage(),
                    'attempt' => $attempt
                ]);

                if ($attempt < $maxRetries) {
                    // Wait a bit before retrying (exponential backoff)
                    sleep(min($attempt, 2));
                    continue;
                }
            }
        }

        // All retries failed - log error but don't throw (allow appointment activation to continue)
        Log::error("Failed to activate appointment chat for call appointment after {$maxRetries} attempts", [
            'appointment_id' => $appointment->id,
            'appointment_type' => $appointment->appointment_type,
            'patient_id' => $appointment->patient_id,
            'doctor_id' => $appointment->doctor_id,
            'error' => $lastError ? $lastError->getMessage() : 'Unknown error',
            'trace' => $lastError ? $lastError->getTraceAsString() : null
        ]);
        $this->warn("   ⚠️ Failed to create appointment chat room after {$maxRetries} attempts: " . ($lastError ? $lastError->getMessage() : 'Unknown error'));
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
