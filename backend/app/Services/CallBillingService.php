<?php

namespace App\Services;

use App\Models\CallSession;
use App\Models\DoctorWallet;
use App\Models\Subscription;
use App\Models\User;
use App\Services\DoctorPaymentService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CallBillingService
{
    /**
     * Server-side authoritative auto-deduction for a single call session.
     *
     * Uses existing idempotency fields on `call_sessions`:
     * - `connected_at`/`ended_at` determine elapsed time
     * - `auto_deductions_processed` ensures each 10-minute bucket is charged once
     */
    public function processAutoDeduction(string $appointmentId, int $patientId, string $callType): array
    {
        try {
            return DB::transaction(function () use ($appointmentId, $patientId, $callType) {
                // Only accept the canonical call types stored in subscriptions and call_sessions
                if (!in_array($callType, ['voice', 'video'], true)) {
                    return [
                        'success' => false,
                        'status' => 400,
                        'message' => 'Invalid call type. Must be voice or video',
                        'data' => null,
                    ];
                }

                $patient = User::find($patientId);
                if (!$patient) {
                    return [
                        'success' => false,
                        'status' => 404,
                        'message' => 'Patient not found',
                        'data' => null,
                    ];
                }

                // Find the call session - must have connected_at for billing
                // Do NOT restrict by status - status might be 'connecting' but call is actually connected
                $callSession = CallSession::where('appointment_id', $appointmentId)
                    ->where('patient_id', $patientId)
                    ->where('status', '!=', CallSession::STATUS_ENDED) // Only exclude ended
                    ->lockForUpdate()
                    ->first();

                if (!$callSession) {
                    return [
                        'success' => false,
                        'status' => 404,
                        'message' => 'No active call session found',
                        'data' => null,
                    ];
                }

                // CRITICAL: Only process billing if call is actually connected
                // RACE-CONDITION SAFETY: If answered but connected_at missing, fix it now
                if (!$callSession->connected_at) {
                    if ($callSession->answered_at) {
                        Log::warning('RACE CONDITION: Auto-deduction attempted but connected_at missing despite answered - fixing now', [
                            'call_session_id' => $callSession->id,
                            'appointment_id' => $appointmentId,
                            'answered_at' => $callSession->answered_at->toISOString(),
                        ]);

                        $callSession->update([
                            'is_connected' => true,
                            'connected_at' => $callSession->answered_at,
                            'status' => CallSession::STATUS_ACTIVE,
                        ]);

                        $callSession->refresh();
                    } else {
                        Log::warning('Auto-deduction attempted for unconnected call', [
                            'call_session_id' => $callSession->id,
                            'appointment_id' => $appointmentId,
                        ]);

                        return [
                            'success' => false,
                            'status' => 400,
                            'message' => 'Call is not connected - cannot process billing',
                            'data' => null,
                        ];
                    }
                }

                // Calculate duration from timestamps only
                $duration = $callSession->connected_at->diffInSeconds($callSession->ended_at ?? now());

                // Calculate auto-deductions: every 10 minutes (600 seconds)
                $autoDeductions = floor($duration / 600);
                $alreadyProcessed = $callSession->auto_deductions_processed ?? 0;
                $newDeductions = max(0, $autoDeductions - $alreadyProcessed);

                // Manual deduction: +1 on manual hangup (not processed here)
                $manualDeduction = $callSession->ended_at ? 1 : 0;

                $deductionResult = [
                    'deductions_processed' => 0,
                    'remaining_calls' => 0,
                    'auto_deductions' => $autoDeductions,
                    'new_deductions' => $newDeductions,
                    'manual_deduction' => $manualDeduction,
                    'errors' => [],
                ];

                // Only process if there are new deductions to make
                if ($newDeductions > 0) {
                    // FIFO: get oldest active subscription with remaining calls
                    $subscription = Subscription::getOldestActiveForDeduction($patient->id, $callType);

                    if ($subscription) {
                        $callTypeField = $callType === 'voice' ? 'voice_calls_remaining' : 'video_calls_remaining';

                        // Deduct new deductions from oldest subscription
                        $subscription->$callTypeField = max(0, $subscription->$callTypeField - $newDeductions);
                        $subscription->save();

                        // Update call session
                        $callSession->auto_deductions_processed = $autoDeductions;
                        $callSession->sessions_used = ($callSession->sessions_used ?? 0) + $newDeductions;
                        $callSession->save();

                        // Pay the doctor for new deductions
                        $doctor = User::find($callSession->doctor_id);
                        if ($doctor) {
                            $doctorWallet = DoctorWallet::getOrCreate($doctor->id);
                            $paymentAmount = DoctorPaymentService::getPaymentAmountForDoctor($callType, $doctor) * $newDeductions;
                            $currency = DoctorPaymentService::getCurrency($doctor);

                            $doctorWallet->credit(
                                $paymentAmount,
                                "Auto-deduction payment for {$newDeductions} {$callType} call session(s) with " . $patient->first_name . ' ' . $patient->last_name,
                                $callType,
                                $callSession->id,
                                'call_sessions_auto',
                                [
                                    'patient_name' => $patient->first_name . ' ' . $patient->last_name,
                                    'session_duration' => $duration,
                                    'sessions_used' => $newDeductions,
                                    'auto_deductions' => $newDeductions,
                                    'currency' => $currency,
                                    'payment_amount' => $paymentAmount,
                                ]
                            );
                        }

                        $deductionResult['deductions_processed'] = $newDeductions;
                        $deductionResult['remaining_calls'] = $subscription->$callTypeField;
                    } else {
                        $deductionResult['errors'][] = 'No subscription with remaining calls found';
                    }
                }

                Log::info('Call auto-deduction processed', [
                    'patient_id' => $patientId,
                    'call_type' => $callType,
                    'appointment_id' => $appointmentId,
                    'duration_seconds' => $duration,
                    'auto_deductions' => $autoDeductions,
                    'new_deductions' => $newDeductions,
                    'deduction_result' => $deductionResult,
                ]);

                return [
                    'success' => true,
                    'status' => 200,
                    'message' => 'Call deduction processed successfully',
                    'data' => $deductionResult,
                ];
            });
        } catch (\Exception $e) {
            Log::error('Error processing call auto-deduction', [
                'patient_id' => $patientId,
                'call_type' => $callType,
                'appointment_id' => $appointmentId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return [
                'success' => false,
                'status' => 500,
                'message' => 'Failed to process call deduction',
                'data' => null,
            ];
        }
    }
}

