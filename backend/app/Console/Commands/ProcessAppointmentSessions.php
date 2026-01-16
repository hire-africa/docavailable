<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Appointment;
use App\Services\DoctorPaymentService;
use Carbon\Carbon;

class ProcessAppointmentSessions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sessions:process-appointment-sessions';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Process appointment sessions including 10-minute first session logic and missed session handling';

    /**
     * Execute the console command.
     * 
     * ⚠️ APPOINTMENT-TIME-BASED TRIGGER ⚠️
     * 
     * Architecture Note: This command checks appointment time windows for missed/cancel logic.
     * It calls billing/payout (deductSessionFromPatient) which is part of legacy appointment billing.
     * 
     * Migration Path:
     * - Once appointments.session_id is populated, this command should:
     *   1. Check if appointment.session_id exists
     *   2. If session_id exists, evaluate missed/cancel logic based on session state, not appointment time
     *   3. Only use appointment-time-based logic for appointments without session_id (legacy)
     * - Billing/payout should come from session completion, not appointment time triggers
     * 
     * TODO: Add session_id check guardrail before calling billing/payout functions
     */
    public function handle()
    {
        // ⚠️ GUARDRAIL: Check feature flag to disable legacy triggers
        if (\App\Services\FeatureFlags::disableLegacyAppointmentTriggers()) {
            $this->info('Legacy appointment triggers disabled via feature flag. Skipping...');
            return 0;
        }

        $this->info('Processing appointment sessions...');

        $now = now();
        $tenMinutesAgo = $now->copy()->subMinutes(10);

        // Find confirmed or in-progress appointments that are at or past their scheduled time (within last 10 minutes)
        // Use appointment_date and appointment_time legacy fields
        // ⚠️ GUARDRAIL: Only process appointments WITHOUT session_id (legacy appointments)
        // Appointments with session_id should be handled by session-based flows, not appointment-time triggers
        $confirmedAppointments = Appointment::select([
            'id',
            'patient_id',
            'doctor_id',
            'appointment_date',
            'appointment_time',
            'status',
            'appointment_type',
            'actual_start_time',
            'session_id'
        ])
            ->whereIn('status', [Appointment::STATUS_CONFIRMED, Appointment::STATUS_IN_PROGRESS])
            ->whereNull('session_id') // ⚠️ Only process legacy appointments without session_id
            ->whereRaw("CONCAT(appointment_date, ' ', appointment_time) <= ?", [$now->toDateTimeString()])
            ->whereRaw("CONCAT(appointment_date, ' ', appointment_time) >= ?", [$tenMinutesAgo->toDateTimeString()])
            ->get();

        if ($confirmedAppointments->isEmpty()) {
            $this->info('No appointments to process.');
            return;
        }

        $this->info("Found {$confirmedAppointments->count()} appointments to process.");

        $processedCount = 0;

        foreach ($confirmedAppointments as $appointment) {
            try {
                // Calculate scheduled time from date and time fields
                $scheduledTime = Carbon::parse($appointment->appointment_date . ' ' . $appointment->appointment_time);
                $elapsedMinutes = $scheduledTime->diffInMinutes(now());

                $this->info("Processing appointment {$appointment->id} (Patient: {$appointment->patient->first_name}, Doctor: {$appointment->doctor->first_name}, Elapsed: {$elapsedMinutes} minutes)");

                // Check if patient joined within first 10 minutes
                if (!$appointment->patient_joined && $elapsedMinutes >= 10) {
                    // Mark as missed, deduct 1 session
                    $appointment->update([
                        'status' => Appointment::STATUS_COMPLETED,
                        'no_show' => true,
                        'sessions_deducted' => 1,
                        'completed_at' => now()
                    ]);

                    // Process deduction
                    $paymentService = new DoctorPaymentService();
                    $paymentService->deductSessionFromPatient($appointment->patient_id, 1);

                    $this->info("Appointment {$appointment->id} marked as missed - 1 session deducted from patient");
                }

                // Check if doctor joined when patient joined
                if ($appointment->patient_joined && !$appointment->doctor_joined && $elapsedMinutes >= 10) {
                    // Cancel session, no deduction
                    $appointment->update([
                        'status' => Appointment::STATUS_CANCELLED,
                        'cancelled_reason' => 'Doctor did not join within first session'
                    ]);

                    $this->info("Appointment {$appointment->id} cancelled - doctor did not join, no session deducted");
                }

                $processedCount++;

            } catch (\Exception $e) {
                $this->error("Error processing appointment {$appointment->id}: " . $e->getMessage());
            }
        }

        $this->info("Completed processing appointment sessions. Processed: {$processedCount} appointments");
    }
}
