<?php

namespace App\Services;

use App\Models\DoctorWallet;
use App\Models\TextSession;
use App\Models\Appointment;
use App\Models\User;
use App\Models\Subscription;
use App\Services\NotificationService;
use Illuminate\Support\Facades\Log;

class DoctorPaymentService
{
    // Payment amounts in MWK (Malawi) - All session types same rate
    private const MWK_PAYMENT_RATES = [
        'text' => 4000.00,
        'audio' => 4000.00,
        'video' => 4000.00,
    ];

    // Payment amounts in USD (International) - All session types same rate
    private const USD_PAYMENT_RATES = [
        'text' => 4.00,
        'audio' => 4.00,
        'video' => 4.00,
    ];

    /**
     * Get payment rates based on doctor's country
     */
    private static function getPaymentRates(User $doctor): array
    {
        $country = strtolower($doctor->country ?? '');
        return $country === 'malawi' ? self::MWK_PAYMENT_RATES : self::USD_PAYMENT_RATES;
    }

    /**
     * Get payment amount for session type based on doctor's country
     */
    public static function getPaymentAmountForDoctor(string $sessionType, User $doctor): float
    {
        $rates = self::getPaymentRates($doctor);
        return $rates[$sessionType] ?? $rates['text'];
    }

    /**
     * Get currency for doctor based on country
     */
    public static function getCurrency(User $doctor): string
    {
        $country = strtolower($doctor->country ?? '');
        return $country === 'malawi' ? 'MWK' : 'USD';
    }

    /**
     * Process payment for a completed text session
     */
    public function processTextSessionPayment(TextSession $session, int $sessionsCount = 1): bool
    {
        try {
            $doctor = $session->doctor;
            $wallet = DoctorWallet::getOrCreate($doctor->id);

            $paymentAmount = self::getPaymentAmountForDoctor('text', $doctor) * $sessionsCount; // FIX: Multiply by sessions count
            $currency = self::getCurrency($doctor);
            $description = "Payment for {$sessionsCount} text session(s) with " . $session->patient->first_name . " " . $session->patient->last_name;
            
            // Get payment transaction ID from patient's subscription
            $paymentTransactionId = null;
            $paymentGateway = null;
            if ($session->patient && $session->patient->subscription) {
                $paymentTransactionId = $session->patient->subscription->payment_transaction_id;
                $paymentGateway = $session->patient->subscription->payment_gateway;
            }

            $wallet->credit(
                $paymentAmount,
                $description,
                'text',
                $session->id,
                'text_sessions',
                [
                    'patient_name' => $session->patient->first_name . " " . $session->patient->last_name,
                    'session_duration' => $session->getTotalDurationMinutes(),
                    'sessions_used' => $sessionsCount, // FIX: Use actual sessions count
                    'payment_transaction_id' => $paymentTransactionId,
                    'payment_gateway' => $paymentGateway,
                    'currency' => $currency,
                    'payment_amount' => $paymentAmount,
                ]
            );

            return true;
        } catch (\Exception $e) {
            \Log::error('Failed to process text session payment: ' . $e->getMessage(), [
                'session_id' => $session->id,
                'doctor_id' => $session->doctor_id,
                'sessions_count' => $sessionsCount,
            ]);
            return false;
        }
    }

    /**
     * Process payment for a completed appointment (audio/video call)
     */
    public function processAppointmentPayment(Appointment $appointment): bool
    {
        try {
            // IDEMPOTENCY CHECK: Prevent double payment
            if ($appointment->earnings_awarded > 0) {
                \Log::warning('Attempted double payment for appointment', [
                    'appointment_id' => $appointment->id,
                    'earnings_awarded' => $appointment->earnings_awarded
                ]);
                return true; // Already paid, consider success
            }

            $doctor = $appointment->doctor;
            $wallet = DoctorWallet::getOrCreate($doctor->id);

            // Determine payment amount based on appointment type and doctor's country
            $sessionType = $appointment->appointment_type ?? 'text';
            $paymentAmount = self::getPaymentAmountForDoctor($sessionType, $doctor);
            $currency = self::getCurrency($doctor);

            $description = "Payment for {$sessionType} appointment with " . $appointment->patient->first_name . " " . $appointment->patient->last_name;
            
            // Get payment transaction ID from patient's subscription
            $paymentTransactionId = null;
            $paymentGateway = null;
            if ($appointment->patient && $appointment->patient->subscription) {
                $paymentTransactionId = $appointment->patient->subscription->payment_transaction_id;
                $paymentGateway = $appointment->patient->subscription->payment_gateway;
            }

            // Use transaction for atomic update
            DB::transaction(function () use ($wallet, $paymentAmount, $description, $sessionType, $appointment, $currency, $paymentTransactionId, $paymentGateway) {
                $wallet->credit(
                    $paymentAmount,
                    $description,
                    $sessionType,
                    $appointment->id,
                    'appointments',
                    [
                        'patient_name' => $appointment->patient->first_name . " " . $appointment->patient->last_name,
                        'appointment_date' => $appointment->appointment_date,
                        'appointment_type' => $appointment->appointment_type,
                        'duration_minutes' => $appointment->duration_minutes ?? 30,
                        'payment_transaction_id' => $paymentTransactionId,
                        'payment_gateway' => $paymentGateway,
                        'currency' => $currency,
                        'payment_amount' => $paymentAmount,
                    ]
                );

                // Mark appointment as paid
                $appointment->update(['earnings_awarded' => $paymentAmount]);
            });

            // Send notification to doctor about payment
            $notificationService = new NotificationService();
            $notificationService->sendWalletNotification(
                $wallet->transactions()->latest()->first(),
                'payment_received',
                "You received {$paymentAmount} {$currency} for completing the {$sessionType} appointment"
            );

            // Send in-app notification to doctor about payment received
            try {
                $patient = $appointment->patient;
                $patientName = $patient ? ($patient->first_name . ' ' . $patient->last_name) : 'Patient';
                $notificationService->createNotification(
                    $appointment->doctor_id,
                    'Payment Received',
                    "You received a payment of {$paymentAmount} {$currency} from {$patientName}.",
                    'payment',
                    [
                        'amount' => $paymentAmount,
                        'currency' => $currency,
                        'payment_id' => $wallet->transactions()->latest()->first()->id ?? null,
                        'patient_name' => $patientName,
                    ]
                );
            } catch (\Exception $notificationError) {
                // Log but don't fail the payment if notification fails
                \Log::warning("Failed to send payment received notification", [
                    'appointment_id' => $appointment->id,
                    'doctor_id' => $appointment->doctor_id,
                    'error' => $notificationError->getMessage()
                ]);
            }

            return true;
        } catch (\Exception $e) {
            \Log::error('Failed to process appointment payment: ' . $e->getMessage(), [
                'appointment_id' => $appointment->id,
                'doctor_id' => $appointment->doctor_id,
            ]);
            return false;
        }
    }

    /**
     * Process complete session end - both doctor payment and patient deduction
     */
    public function processSessionEnd(TextSession $session, bool $isManualEnd = true): array
    {
        $result = [
            'doctor_payment_success' => false,
            'patient_deduction_success' => false,
            'doctor_payment_amount' => 0,
            'patient_sessions_deducted' => 0,
            'auto_deductions' => 0,
            'manual_deduction' => 0,
            'errors' => []
        ];

        try {
            // Calculate sessions to deduct
            $sessionsToDeduct = $session->getSessionsToDeduct($isManualEnd);
            $elapsedMinutes = $session->getElapsedMinutes();
            $autoDeductions = floor($elapsedMinutes / 10);
            $manualDeduction = $isManualEnd ? 1 : 0;
            
            $result['auto_deductions'] = $autoDeductions;
            $result['manual_deduction'] = $manualDeduction;
            $result['patient_sessions_deducted'] = $sessionsToDeduct;
            
            // Process doctor payment - FIX: Pass sessions count
            $doctorPaymentSuccess = $this->processTextSessionPayment($session, $sessionsToDeduct);
            $result['doctor_payment_success'] = $doctorPaymentSuccess;
            $result['doctor_payment_amount'] = self::getPaymentAmountForDoctor('text', $session->doctor) * $sessionsToDeduct;

            // Process patient subscription deduction
            $patientDeductionSuccess = $this->deductMultipleSessionsFromPatient($session, $sessionsToDeduct);
            $result['patient_deduction_success'] = $patientDeductionSuccess;

            if (!$doctorPaymentSuccess) {
                $result['errors'][] = 'Failed to process doctor payment';
            }
            if (!$patientDeductionSuccess) {
                $result['errors'][] = 'Failed to deduct from patient subscription';
            }

        } catch (\Exception $e) {
            $result['errors'][] = 'Session end processing failed: ' . $e->getMessage();
            \Log::error('Failed to process session end: ' . $e->getMessage(), [
                'session_id' => $session->id,
                'doctor_id' => $session->doctor_id,
                'patient_id' => $session->patient_id,
                'is_manual_end' => $isManualEnd,
            ]);
        }

        return $result;
    }

    /**
     * Process complete appointment end - both doctor payment and patient deduction
     */
    public function processAppointmentEnd(Appointment $appointment): array
    {
        $result = [
            'doctor_payment_success' => false,
            'patient_deduction_success' => false,
            'doctor_payment_amount' => 0,
            'patient_sessions_deducted' => 0,
            'errors' => []
        ];

        try {
            // Process doctor payment
            $doctorPaymentSuccess = $this->processAppointmentPayment($appointment);
            $result['doctor_payment_success'] = $doctorPaymentSuccess;

            // Determine payment amount based on appointment type and doctor's country
            $sessionType = $appointment->appointment_type ?? 'text';
            $paymentAmount = self::getPaymentAmountForDoctor($sessionType, $appointment->doctor);
            $result['doctor_payment_amount'] = $paymentAmount;

            // Process patient subscription deduction
            $patientDeductionSuccess = $this->deductFromPatientSubscriptionForAppointment($appointment);
            $result['patient_deduction_success'] = $patientDeductionSuccess;
            $result['patient_sessions_deducted'] = 1;

            if (!$doctorPaymentSuccess) {
                $result['errors'][] = 'Failed to process doctor payment';
            }
            if (!$patientDeductionSuccess) {
                $result['errors'][] = 'Failed to deduct from patient subscription';
            }

        } catch (\Exception $e) {
            $result['errors'][] = 'Appointment end processing failed: ' . $e->getMessage();
            \Log::error('Failed to process appointment end: ' . $e->getMessage(), [
                'appointment_id' => $appointment->id,
                'doctor_id' => $appointment->doctor_id,
                'patient_id' => $appointment->patient_id,
            ]);
        }

        return $result;
    }

    /**
     * Deduct from patient's subscription for text session
     */
    private function deductFromPatientSubscription(TextSession $session): bool
    {
        try {
            $patient = $session->patient;
            if (!$patient || !$patient->subscription) {
                \Log::warning('Patient has no subscription for text session deduction', [
                    'session_id' => $session->id,
                    'patient_id' => $session->patient_id,
                ]);
                return false;
            }

            $subscription = $patient->subscription;
            
            // Check if subscription is active
            if (!$subscription->isActive) {
                \Log::warning('Patient subscription is not active for text session deduction', [
                    'session_id' => $session->id,
                    'patient_id' => $session->patient_id,
                    'subscription_status' => $subscription->status,
                ]);
                return false;
            }

            // Check if text sessions are available
            if ($subscription->text_sessions_remaining <= 0) {
                \Log::warning('Patient has no text sessions remaining for deduction', [
                    'session_id' => $session->id,
                    'patient_id' => $session->patient_id,
                    'text_sessions_remaining' => $subscription->text_sessions_remaining,
                ]);
                return false;
            }

            // Deduct one text session
            $subscription->decrement('text_sessions_remaining');
            
            \Log::info('Successfully deducted text session from patient subscription', [
                'session_id' => $session->id,
                'patient_id' => $session->patient_id,
                'text_sessions_remaining_after' => $subscription->text_sessions_remaining,
            ]);

            return true;

        } catch (\Exception $e) {
            \Log::error('Failed to deduct from patient subscription for text session: ' . $e->getMessage(), [
                'session_id' => $session->id,
                'patient_id' => $session->patient_id,
            ]);
            return false;
        }
    }

    /**
     * Deduct from patient's subscription for appointment
     */
    public function deductFromPatientSubscriptionForAppointment(Appointment $appointment): bool
    {
        try {
            // IDEMPOTENCY CHECK: Prevent double deduction
            if ($appointment->sessions_deducted > 0) {
                \Log::warning('Attempted double deduction for appointment', [
                    'appointment_id' => $appointment->id,
                    'sessions_deducted' => $appointment->sessions_deducted
                ]);
                return true; // Already deducted, consider success
            }

            $patient = $appointment->patient;
            if (!$patient || !$patient->subscription) {
                \Log::warning('Patient has no subscription for appointment deduction', [
                    'appointment_id' => $appointment->id,
                    'patient_id' => $appointment->patient_id,
                ]);
                return false;
            }

            $subscription = $patient->subscription;
            
            // Check if subscription is active
            if (!$subscription->isActive) {
                \Log::warning('Patient subscription is not active for appointment deduction', [
                    'appointment_id' => $appointment->id,
                    'patient_id' => $appointment->patient_id,
                    'subscription_status' => $subscription->status,
                ]);
                return false;
            }

            // Determine which session type to deduct based on appointment type
            $appointmentType = $appointment->appointment_type ?? 'text';
            $sessionsRemaining = 0;
            
            // Use transaction for atomic update
            \DB::transaction(function () use ($subscription, $appointment, $appointmentType, &$sessionsRemaining) {
                switch ($appointmentType) {
                    case 'text':
                        if ($subscription->text_sessions_remaining <= 0) {
                            throw new \Exception('Insufficient text sessions');
                        }
                        $subscription->decrement('text_sessions_remaining');
                        $sessionsRemaining = $subscription->text_sessions_remaining;
                        break;
                        
                    case 'audio':
                        if ($subscription->voice_calls_remaining <= 0) {
                            throw new \Exception('Insufficient voice calls');
                        }
                        $subscription->decrement('voice_calls_remaining');
                        $sessionsRemaining = $subscription->voice_calls_remaining;
                        break;
                        
                    case 'video':
                        if ($subscription->video_calls_remaining <= 0) {
                            throw new \Exception('Insufficient video calls');
                        }
                        $subscription->decrement('video_calls_remaining');
                        $sessionsRemaining = $subscription->video_calls_remaining;
                        break;
                        
                    default:
                        throw new \Exception('Unknown appointment type');
                }
                
                // Mark appointment as deducted
                $appointment->update(['sessions_deducted' => 1]);
            });
            
            \Log::info('Successfully deducted session from patient subscription for appointment', [
                'appointment_id' => $appointment->id,
                'patient_id' => $appointment->patient_id,
                'appointment_type' => $appointmentType,
                'sessions_remaining_after' => $sessionsRemaining,
            ]);

            return true;

        } catch (\Exception $e) {
            \Log::error('Failed to deduct from patient subscription for appointment: ' . $e->getMessage(), [
                'appointment_id' => $appointment->id,
                'patient_id' => $appointment->patient_id,
            ]);
            return false;
        }
    }

    /**
     * Deduct multiple sessions from patient's subscription for text session
     */
    private function deductMultipleSessionsFromPatient(TextSession $session, int $sessionsToDeduct): bool
    {
        try {
            $patient = $session->patient;
            if (!$patient || !$patient->subscription) {
                \Log::warning('Patient has no subscription for multiple text session deduction', [
                    'session_id' => $session->id,
                    'patient_id' => $patient->id,
                    'sessions_to_deduct' => $sessionsToDeduct,
                ]);
                return false;
            }

            $subscription = $patient->subscription;
            
            // Check if subscription is active
            if (!$subscription->isActive) {
                \Log::warning('Patient subscription is not active for multiple text session deduction', [
                    'session_id' => $session->id,
                    'patient_id' => $patient->id,
                    'subscription_status' => $subscription->status,
                    'sessions_to_deduct' => $sessionsToDeduct,
                ]);
                return false;
            }

            // SAFETY CHECK: Prevent negative sessions
            if ($subscription->text_sessions_remaining < $sessionsToDeduct) {
                \Log::warning('Insufficient sessions remaining for deduction', [
                    'session_id' => $session->id,
                    'patient_id' => $patient->id,
                    'sessions_remaining' => $subscription->text_sessions_remaining,
                    'sessions_to_deduct' => $sessionsToDeduct,
                ]);
                return false;
            }

            // SAFETY CHECK: Ensure sessions to deduct is positive
            if ($sessionsToDeduct <= 0) {
                \Log::info('No sessions to deduct (sessions_to_deduct <= 0)', [
                    'session_id' => $session->id,
                    'patient_id' => $patient->id,
                    'sessions_to_deduct' => $sessionsToDeduct,
                ]);
                return true; // Not an error, just no deduction needed
            }

            // Deduct the specified number of sessions
            $subscription->decrement('text_sessions_remaining', $sessionsToDeduct);
            
            \Log::info('Successfully deducted multiple text sessions from patient subscription', [
                'session_id' => $session->id,
                'patient_id' => $patient->id,
                'text_sessions_remaining_after' => $subscription->text_sessions_remaining,
                'sessions_deducted' => $sessionsToDeduct,
            ]);

            return true;

        } catch (\Exception $e) {
            \Log::error('Failed to deduct multiple text sessions from patient subscription: ' . $e->getMessage(), [
                'session_id' => $session->id,
                'patient_id' => $session->patient_id,
                'sessions_to_deduct' => $sessionsToDeduct,
            ]);
            return false;
        }
    }

    /**
     * Process auto-deduction during active session - FIXED VERSION
     */
    public function processAutoDeduction(TextSession $session): bool
    {
        try {
            $elapsedMinutes = $session->getElapsedMinutes();
            $autoDeductions = floor($elapsedMinutes / 10);
            
            // FIX: Check if we've already processed these deductions
            $alreadyProcessed = $session->auto_deductions_processed ?? 0;
            $newDeductions = $autoDeductions - $alreadyProcessed;
            
            // Only process if there are new deductions to make
            if ($newDeductions > 0) {
                // FIX: Use database transaction with atomic updates to prevent race conditions
                return \DB::transaction(function () use ($session, $newDeductions, $autoDeductions, $alreadyProcessed, $elapsedMinutes) {
                    // Refresh session to get latest state inside transaction
                    $freshSession = TextSession::where('id', $session->id)->lockForUpdate()->first();
                    
                    if (!$freshSession) {
                        return false;
                    }

                    // Recalculate based on fresh session data
                    $freshAlreadyProcessed = $freshSession->auto_deductions_processed ?? 0;
                    $freshNewDeductions = $autoDeductions - $freshAlreadyProcessed;

                    if ($freshNewDeductions <= 0) {
                        return true; // Already processed by another request
                    }

                    $patient = $freshSession->patient;
                    if ($patient && $patient->subscription) {
                        // Lock subscription for update to prevent race conditions
                        $subscription = $patient->subscription()->lockForUpdate()->first();
                        
                        if (!$subscription) {
                            \Log::warning('Subscription not found during auto-deduction', [
                                'session_id' => $freshSession->id,
                                'patient_id' => $patient->id,
                            ]);
                            return false;
                        }
                        
                        // SAFETY CHECK: Prevent negative sessions with locked record
                        if ($subscription->text_sessions_remaining < $freshNewDeductions) {
                            \Log::warning('Insufficient sessions remaining for auto-deduction', [
                                'session_id' => $freshSession->id,
                                'patient_id' => $patient->id,
                                'sessions_remaining' => $subscription->text_sessions_remaining,
                                'new_deductions' => $freshNewDeductions,
                                'elapsed_minutes' => $elapsedMinutes,
                            ]);
                            return false;
                        }
                        
                        // Atomic deduction from subscription
                        $subscription->text_sessions_remaining = max(0, $subscription->text_sessions_remaining - $freshNewDeductions);
                        $subscription->save();
                        
                        // Award doctor earnings for new deductions only
                        $doctor = $freshSession->doctor;
                        if ($doctor) {
                            $wallet = DoctorWallet::getOrCreate($doctor->id);
                            $paymentAmount = self::getPaymentAmountForDoctor('text', $doctor) * $freshNewDeductions;
                            $wallet->credit($paymentAmount, "Auto-deduction for session {$freshSession->id} ({$freshNewDeductions} sessions)");
                            
                            // Send notification to doctor about payment
                            $notificationService = new NotificationService();
                            $notificationService->sendWalletNotification(
                                $wallet->transactions()->latest()->first(),
                                'payment_received',
                                "You received {$paymentAmount} for {$freshNewDeductions} session(s) from auto-deduction"
                            );
                        }
                        
                        // Update session to track processed deductions
                        $freshSession->update([
                            'auto_deductions_processed' => $autoDeductions,
                            'sessions_used' => $freshSession->sessions_used + $freshNewDeductions
                        ]);
                        
                        \Log::info("Auto-deducted {$freshNewDeductions} new sessions (total: {$autoDeductions})", [
                            'session_id' => $freshSession->id,
                            'elapsed_minutes' => $elapsedMinutes,
                            'auto_deductions' => $autoDeductions,
                            'already_processed' => $freshAlreadyProcessed,
                            'new_deductions' => $freshNewDeductions,
                            'sessions_remaining_after' => $subscription->text_sessions_remaining,
                        ]);
                        
                        return true;
                    }
                    
                    return false;
                });
            }
            
            return true; // No new deductions needed
            
        } catch (\Exception $e) {
            \Log::error('Failed to process auto-deduction: ' . $e->getMessage(), [
                'session_id' => $session->id,
                'patient_id' => $session->patient_id,
                'trace' => $e->getTraceAsString()
            ]);
            return false;
        }
    }

    /**
     * Get payment amount for session type (deprecated - use getPaymentAmountsForDoctor instead)
     */
    public static function getPaymentAmount(string $sessionType): float
    {
        // Default to MWK rates for backward compatibility
        return self::MWK_PAYMENT_RATES[$sessionType] ?? self::MWK_PAYMENT_RATES['text'];
    }

    /**
     * Get all payment amounts (deprecated - use getPaymentAmountsForDoctor instead)
     */
    public static function getPaymentAmounts(): array
    {
        // Default to MWK rates for backward compatibility
        return self::MWK_PAYMENT_RATES;
    }

    /**
     * Get payment amounts for a specific doctor based on their country
     */
    public static function getPaymentAmountsForDoctor(User $doctor): array
    {
        $rates = self::getPaymentRates($doctor);
        $currency = self::getCurrency($doctor);
        
        return [
            'text' => $rates['text'],
            'audio' => $rates['audio'],
            'video' => $rates['video'],
            'currency' => $currency,
        ];
    }

    /**
     * Process manual end deduction - accounts for already processed auto-deductions
     */
    public function processManualEndDeduction(TextSession $session): bool
    {
        try {
            $patient = $session->patient;
            if (!$patient) {
                \Log::error('Patient not found for manual end deduction', [
                    'session_id' => $session->id,
                    'patient_id' => $session->patient_id,
                ]);
                return false;
            }
            
            if (!$patient->subscription) {
                \Log::error('No subscription found for manual end deduction', [
                    'session_id' => $session->id,
                    'patient_id' => $session->patient_id,
                ]);
                return false;
            }
            
            $subscription = $patient->subscription;
            if (!$subscription->isActive) {
                \Log::warning('Inactive subscription for manual end deduction - allowing end anyway', [
                    'session_id' => $session->id,
                    'patient_id' => $session->patient_id,
                ]);
                // Continue with deduction even if subscription is inactive
            }
            
            // Calculate sessions to deduct (accounts for auto-deductions already processed)
            $sessionsToDeduct = $session->getSessionsToDeduct(true);
            
            if ($sessionsToDeduct <= 0) {
                \Log::info('No sessions to deduct for manual end (already processed via auto-deductions)', [
                    'session_id' => $session->id,
                    'elapsed_minutes' => $session->getElapsedMinutes(),
                    'auto_deductions_processed' => $session->auto_deductions_processed,
                    'sessions_used' => $session->sessions_used
                ]);
                return true; // Already deducted, nothing to do
            }
            
            // More flexible safety check - allow ending even with 0 sessions
            if ($subscription->text_sessions_remaining < $sessionsToDeduct) {
                \Log::warning('Insufficient sessions remaining - deducting what we can', [
                    'session_id' => $session->id,
                    'patient_id' => $session->patient_id,
                    'sessions_remaining' => $subscription->text_sessions_remaining,
                    'sessions_to_deduct' => $sessionsToDeduct,
                ]);
                // Deduct what we can
                $sessionsToDeduct = max(0, $subscription->text_sessions_remaining);
            }
            
            // Deduct sessions (only what hasn't been auto-deducted)
            if ($sessionsToDeduct > 0) {
                $subscription->decrement('text_sessions_remaining', $sessionsToDeduct);
                
                // Award doctor earnings for remaining sessions
                $doctor = $session->doctor;
                if ($doctor) {
                    $wallet = DoctorWallet::getOrCreate($doctor->id);
                    $paymentAmount = self::getPaymentAmountForDoctor('text', $doctor) * $sessionsToDeduct;
                    $currency = self::getCurrency($doctor);
                    
                    $wallet->credit(
                        $paymentAmount,
                        "Manual end payment for session {$session->id} ({$sessionsToDeduct} session(s))",
                        'text',
                        $session->id,
                        'text_sessions',
                        [
                            'patient_name' => $session->patient->first_name . " " . $session->patient->last_name,
                            'session_duration' => $session->getElapsedMinutes(),
                            'sessions_used' => $sessionsToDeduct,
                            'auto_deductions_processed' => $session->auto_deductions_processed ?? 0,
                            'payment_transaction_id' => $subscription->payment_transaction_id,
                            'payment_gateway' => $subscription->payment_gateway,
                            'currency' => $currency,
                            'payment_amount' => $paymentAmount,
                            'end_type' => 'manual'
                        ]
                    );
                }
            }
            
            \Log::info("Manual end deduction processed", [
                'session_id' => $session->id,
                'patient_id' => $session->patient_id,
                'sessions_to_deduct' => $sessionsToDeduct,
                'auto_deductions_processed' => $session->auto_deductions_processed ?? 0,
                'elapsed_minutes' => $session->getElapsedMinutes(),
                'sessions_remaining_after' => $subscription->text_sessions_remaining,
                'end_type' => 'manual'
            ]);
            
            return true;
            
        } catch (\Exception $e) {
            \Log::error('Failed to process manual end deduction: ' . $e->getMessage(), [
                'session_id' => $session->id,
                'patient_id' => $session->patient_id,
            ]);
            return false;
        }
    }
} 