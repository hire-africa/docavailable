<?php

namespace App\Services;

use App\Models\DoctorWallet;
use App\Models\TextSession;
use App\Models\Appointment;
use App\Models\User;
use App\Models\Subscription;

class DoctorPaymentService
{
    // Payment amounts in MWK (Malawi)
    private const MWK_PAYMENT_RATES = [
        'text' => 4000.00,
        'audio' => 5000.00,
        'video' => 6000.00,
    ];

    // Payment amounts in USD (International)
    private const USD_PAYMENT_RATES = [
        'text' => 4.00,
        'audio' => 5.00,
        'video' => 6.00,
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
    private static function getPaymentAmountForDoctor(string $sessionType, User $doctor): float
    {
        $rates = self::getPaymentRates($doctor);
        return $rates[$sessionType] ?? $rates['text'];
    }

    /**
     * Get currency for doctor based on country
     */
    private static function getCurrency(User $doctor): string
    {
        $country = strtolower($doctor->country ?? '');
        return $country === 'malawi' ? 'MWK' : 'USD';
    }

    /**
     * Process payment for a completed text session
     */
    public function processTextSessionPayment(TextSession $session): bool
    {
        try {
            $doctor = $session->doctor;
            $wallet = DoctorWallet::getOrCreate($doctor->id);

            $paymentAmount = self::getPaymentAmountForDoctor('text', $doctor);
            $currency = self::getCurrency($doctor);
            $description = "Payment for text session with " . $session->patient->first_name . " " . $session->patient->last_name;
            
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
                    'sessions_used' => $session->sessions_used,
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
            
            // Process doctor payment
            $doctorPaymentSuccess = $this->processTextSessionPayment($session);
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
    private function deductFromPatientSubscriptionForAppointment(Appointment $appointment): bool
    {
        try {
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
            
            switch ($appointmentType) {
                case 'text':
                    if ($subscription->text_sessions_remaining <= 0) {
                        \Log::warning('Patient has no text sessions remaining for appointment deduction', [
                            'appointment_id' => $appointment->id,
                            'patient_id' => $appointment->patient_id,
                            'text_sessions_remaining' => $subscription->text_sessions_remaining,
                        ]);
                        return false;
                    }
                    $subscription->decrement('text_sessions_remaining');
                    $sessionsRemaining = $subscription->text_sessions_remaining;
                    break;
                    
                case 'audio':
                    if ($subscription->voice_calls_remaining <= 0) {
                        \Log::warning('Patient has no voice calls remaining for appointment deduction', [
                            'appointment_id' => $appointment->id,
                            'patient_id' => $appointment->patient_id,
                            'voice_calls_remaining' => $subscription->voice_calls_remaining,
                        ]);
                        return false;
                    }
                    $subscription->decrement('voice_calls_remaining');
                    $sessionsRemaining = $subscription->voice_calls_remaining;
                    break;
                    
                case 'video':
                    if ($subscription->video_calls_remaining <= 0) {
                        \Log::warning('Patient has no video calls remaining for appointment deduction', [
                            'appointment_id' => $appointment->id,
                            'patient_id' => $appointment->patient_id,
                            'video_calls_remaining' => $subscription->video_calls_remaining,
                        ]);
                        return false;
                    }
                    $subscription->decrement('video_calls_remaining');
                    $sessionsRemaining = $subscription->video_calls_remaining;
                    break;
                    
                default:
                    \Log::warning('Unknown appointment type for deduction', [
                        'appointment_id' => $appointment->id,
                        'appointment_type' => $appointmentType,
                    ]);
                    return false;
            }
            
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
     * Process auto-deduction during active session
     */
    public function processAutoDeduction(TextSession $session): bool
    {
        try {
            $elapsedMinutes = $session->getElapsedMinutes();
            $autoDeductions = floor($elapsedMinutes / 10);
            
            // Check if we need to deduct sessions
            if ($autoDeductions > 0) {
                $patient = $session->patient;
                if ($patient && $patient->subscription) {
                    $subscription = $patient->subscription;
                    
                    // Deduct sessions
                    $subscription->decrement('text_sessions_remaining', $autoDeductions);
                    
                    // Award doctor earnings
                    $doctor = $session->doctor;
                    if ($doctor) {
                        $wallet = DoctorWallet::getOrCreate($doctor->id);
                        $paymentAmount = self::getPaymentAmountForDoctor('text', $doctor) * $autoDeductions;
                        $wallet->credit($paymentAmount, "Auto-deduction for session {$session->id}");
                    }
                    
                    \Log::info("Auto-deducted {$autoDeductions} sessions", [
                        'session_id' => $session->id,
                        'elapsed_minutes' => $elapsedMinutes,
                        'auto_deductions' => $autoDeductions,
                    ]);
                    
                    return true;
                }
            }
            
            return false;
        } catch (\Exception $e) {
            \Log::error('Failed to process auto-deduction: ' . $e->getMessage());
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
} 