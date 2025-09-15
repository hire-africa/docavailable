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
     */
    public function handle()
    {
        $this->info('Processing appointment sessions...');

        // Find confirmed appointments that are at or past their scheduled time
        $confirmedAppointments = Appointment::where('status', Appointment::STATUS_CONFIRMED)
            ->where('scheduled_time', '<=', now())
            ->where('scheduled_time', '>=', now()->subMinutes(10))
            ->get();

        if ($confirmedAppointments->isEmpty()) {
            $this->info('No appointments to process.');
            return;
        }

        $this->info("Found {$confirmedAppointments->count()} appointments to process.");

        $processedCount = 0;

        foreach ($confirmedAppointments as $appointment) {
            try {
                $scheduledTime = Carbon::parse($appointment->scheduled_time);
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
