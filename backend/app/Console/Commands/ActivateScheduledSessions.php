<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\TextSession;
use App\Services\NotificationService;
use Illuminate\Support\Facades\Log;

class ActivateScheduledSessions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sessions:activate-scheduled';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Activate scheduled text sessions when their scheduled time arrives';

    /**
     * Execute the console command.
     */
    public function handle(NotificationService $notificationService): int
    {
        $this->info('Checking for scheduled sessions to activate...');

        // Find all scheduled sessions where scheduled_at has passed
        $sessionsToActivate = TextSession::where('status', TextSession::STATUS_SCHEDULED)
            ->whereNotNull('scheduled_at')
            ->where('scheduled_at', '<=', now())
            ->get();

        if ($sessionsToActivate->isEmpty()) {
            Log::info('No scheduled sessions to activate at this time.', [
                'current_time' => now()->toDateTimeString()
            ]);
            $this->info('No scheduled sessions to activate.');
            return Command::SUCCESS;
        }

        Log::info("Found {$sessionsToActivate->count()} scheduled sessions to activate.", [
            'session_ids' => $sessionsToActivate->pluck('id')->toArray()
        ]);
        $this->info("Found {$sessionsToActivate->count()} scheduled sessions to activate.");

        $activated = 0;
        $failed = 0;

        foreach ($sessionsToActivate as $session) {
            try {
                // Activate the session
                $session->activateScheduledSession();

                // Send notification to both patient and doctor
                $notificationService->sendTextSessionNotification(
                    $session,
                    'scheduled_activated',
                    'Your scheduled session is now active'
                );

                // Send push notification to doctor about incoming session
                $doctor = $session->doctor;
                if ($doctor && $doctor->push_token && $doctor->push_notifications_enabled) {
                    try {
                        $patient = $session->patient;
                        $patientName = $patient ? ($patient->first_name . ' ' . $patient->last_name) : 'Patient';
                        $sessionTypeDisplay = match ($session->session_type) {
                            'audio' => 'voice call',
                            'video' => 'video call',
                            default => 'text chat'
                        };

                        $doctor->notify(new \App\Notifications\ScheduledSessionActivated(
                            $session,
                            $patientName,
                            $sessionTypeDisplay
                        ));
                    } catch (\Exception $pushError) {
                        Log::warning("Failed to send push notification for activated scheduled session", [
                            'session_id' => $session->id,
                            'doctor_id' => $doctor->id,
                            'error' => $pushError->getMessage()
                        ]);
                    }
                }

                Log::info("Activated scheduled session", [
                    'session_id' => $session->id,
                    'patient_id' => $session->patient_id,
                    'doctor_id' => $session->doctor_id,
                    'session_type' => $session->session_type,
                    'scheduled_at' => $session->scheduled_at,
                ]);

                $activated++;

            } catch (\Exception $e) {
                Log::error("Failed to activate scheduled session", [
                    'session_id' => $session->id,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                $failed++;
            }
        }

        $this->info("Activated {$activated} scheduled sessions. Failed: {$failed}");

        return Command::SUCCESS;
    }
}
