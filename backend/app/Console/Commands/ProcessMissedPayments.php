<?php

namespace App\Console\Commands;

use App\Models\TextSession;
use App\Models\Appointment;
use App\Services\DoctorPaymentService;
use Illuminate\Console\Command;
use Carbon\Carbon;

class ProcessMissedPayments extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'payments:process-missed {--dry-run : Show what would be processed without actually processing}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Process missed payments for completed sessions and appointments';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting to process missed payments...');
        $isDryRun = $this->option('dry-run');

        if ($isDryRun) {
            $this->warn('DRY RUN MODE - No actual payments will be processed');
        }

        $totalProcessed = 0;

        // Process text sessions
        $textSessionsProcessed = $this->processTextSessions($isDryRun);
        $totalProcessed += $textSessionsProcessed;

        // Process appointments
        $appointmentsProcessed = $this->processAppointments($isDryRun);
        $totalProcessed += $appointmentsProcessed;

        $this->info("Total sessions/appointments processed: {$totalProcessed}");

        if ($isDryRun) {
            $this->info('Run without --dry-run to actually process the payments');
        } else {
            $this->info('Payment processing completed successfully!');
        }

        return 0;
    }

    /**
     * Process missed text session payments
     */
    private function processTextSessions(bool $isDryRun): int
    {
        $this->info('Checking for missed text session payments and deductions...');

        // Find ended/expired text sessions without payment transactions
        $sessions = TextSession::whereIn('status', ['ended', 'expired'])
            ->whereDoesntHave('doctor.wallet.transactions', function($query) {
                $query->where('session_type', 'text')
                      ->where('session_table', 'text_sessions');
            })
            ->with(['doctor', 'patient'])
            ->get();

        $this->info("Found {$sessions->count()} text sessions without payments");

        $processed = 0;
        $paymentService = new DoctorPaymentService();

        foreach ($sessions as $session) {
            if ($isDryRun) {
                $this->line("Would process payment and deduction for text session {$session->id} - Doctor: {$session->doctor->first_name} {$session->doctor->last_name}");
            } else {
                try {
                    $result = $paymentService->processSessionEnd($session);
                    
                    $doctorSuccess = $result['doctor_payment_success'] ? '✓' : '✗';
                    $patientSuccess = $result['patient_deduction_success'] ? '✓' : '✗';
                    
                    $this->line("{$doctorSuccess} Doctor payment | {$patientSuccess} Patient deduction for text session {$session->id}");
                    
                    if ($result['doctor_payment_success'] || $result['patient_deduction_success']) {
                        $processed++;
                    }
                    
                    if (!empty($result['errors'])) {
                        foreach ($result['errors'] as $error) {
                            $this->error("  - {$error}");
                        }
                    }
                } catch (\Exception $e) {
                    $this->error("✗ Error processing text session {$session->id}: " . $e->getMessage());
                }
            }
        }

        $this->info("Text sessions processed: {$processed}");
        return $processed;
    }

    /**
     * Process missed appointment payments
     */
    private function processAppointments(bool $isDryRun): int
    {
        $this->info('Checking for missed appointment payments and deductions...');

        // Find completed appointments without payment transactions
        $appointments = Appointment::where('status', Appointment::STATUS_COMPLETED)
            ->whereDoesntHave('doctor.wallet.transactions', function($query) {
                $query->where('session_table', 'appointments');
            })
            ->with(['doctor', 'patient'])
            ->get();

        $this->info("Found {$appointments->count()} appointments without payments");

        $processed = 0;
        $paymentService = new DoctorPaymentService();

        foreach ($appointments as $appointment) {
            if ($isDryRun) {
                $this->line("Would process payment and deduction for appointment {$appointment->id} - Doctor: {$appointment->doctor->first_name} {$appointment->doctor->last_name} - Type: {$appointment->appointment_type}");
            } else {
                try {
                    $result = $paymentService->processAppointmentEnd($appointment);
                    
                    $doctorSuccess = $result['doctor_payment_success'] ? '✓' : '✗';
                    $patientSuccess = $result['patient_deduction_success'] ? '✓' : '✗';
                    
                    $this->line("{$doctorSuccess} Doctor payment | {$patientSuccess} Patient deduction for appointment {$appointment->id}");
                    
                    if ($result['doctor_payment_success'] || $result['patient_deduction_success']) {
                        $processed++;
                    }
                    
                    if (!empty($result['errors'])) {
                        foreach ($result['errors'] as $error) {
                            $this->error("  - {$error}");
                        }
                    }
                } catch (\Exception $e) {
                    $this->error("✗ Error processing appointment {$appointment->id}: " . $e->getMessage());
                }
            }
        }

        $this->info("Appointments processed: {$processed}");
        return $processed;
    }
} 