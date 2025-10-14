<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\User;
use App\Models\Subscription;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class TextAppointmentController extends Controller
{
    /**
     * Start a text appointment session when appointment time is reached.
     */
    public function startSession(Request $request): JsonResponse
    {
        try {
            // Validate request
            $validator = Validator::make($request->all(), [
                'appointment_id' => 'required|integer|exists:appointments,id',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $appointmentId = $request->input('appointment_id');
            $userId = auth()->id();

            // Get the appointment
            $appointment = Appointment::find($appointmentId);
            if (!$appointment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Appointment not found'
                ], 404);
            }

            // Verify user is part of this appointment
            if ($appointment->patient_id !== $userId && $appointment->doctor_id !== $userId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized access to appointment'
                ], 403);
            }

            // Check if this is a text appointment
            if ($appointment->appointment_type !== 'text') {
                return response()->json([
                    'success' => false,
                    'message' => 'Only text appointments can start sessions'
                ], 400);
            }

            // Check if appointment is confirmed
            if ($appointment->status !== 'confirmed' && $appointment->status !== 1) {
                return response()->json([
                    'success' => false,
                    'message' => 'Appointment must be confirmed to start session'
                ], 400);
            }

            // Check if appointment time has been reached
            $appointmentDateTime = $this->parseAppointmentDateTime($appointment->appointment_date, $appointment->appointment_time);
            if (!$appointmentDateTime || $appointmentDateTime > now()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Appointment time has not been reached yet'
                ], 400);
            }

            // Check if session already exists
            $existingSession = DB::table('text_appointment_sessions')
                ->where('appointment_id', $appointmentId)
                ->where('is_active', true)
                ->first();

            if ($existingSession) {
                return response()->json([
                    'success' => true,
                    'message' => 'Text appointment session already active',
                    'data' => [
                        'session_id' => $existingSession->id,
                        'appointment_id' => $existingSession->appointment_id,
                        'is_active' => $existingSession->is_active,
                        'start_time' => $existingSession->start_time,
                        'sessions_used' => $existingSession->sessions_used,
                    ]
                ]);
            }

            // Get patient's subscription
            $subscription = Subscription::where('user_id', $appointment->patient_id)
                ->where('is_active', true)
                ->first();

            if (!$subscription) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active subscription found for patient'
                ], 400);
            }

            // Create text appointment session
            $sessionId = DB::table('text_appointment_sessions')->insertGetId([
                'appointment_id' => $appointmentId,
                'patient_id' => $appointment->patient_id,
                'doctor_id' => $appointment->doctor_id,
                'is_active' => true,
                'start_time' => now(),
                'last_activity_time' => now(),
                'has_patient_activity' => false,
                'has_doctor_activity' => false,
                'sessions_used' => 0,
                'is_ended' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            Log::info("Text appointment session started", [
                'session_id' => $sessionId,
                'appointment_id' => $appointmentId,
                'patient_id' => $appointment->patient_id,
                'doctor_id' => $appointment->doctor_id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Text appointment session started successfully',
                'data' => [
                    'session_id' => $sessionId,
                    'appointment_id' => $appointmentId,
                    'is_active' => true,
                    'start_time' => now(),
                    'sessions_used' => 0,
                ]
            ]);

        } catch (\Exception $e) {
            Log::error("Error starting text appointment session", [
                'error' => $e->getMessage(),
                'appointment_id' => $request->input('appointment_id'),
                'user_id' => auth()->id(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to start text appointment session: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update activity for text appointment session.
     */
    public function updateActivity(Request $request): JsonResponse
    {
        try {
            // Validate request
            $validator = Validator::make($request->all(), [
                'appointment_id' => 'required|integer|exists:appointments,id',
                'user_type' => 'required|string|in:patient,doctor',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $appointmentId = $request->input('appointment_id');
            $userType = $request->input('user_type');
            $userId = auth()->id();

            // Get the session
            $session = DB::table('text_appointment_sessions')
                ->where('appointment_id', $appointmentId)
                ->where('is_active', true)
                ->first();

            if (!$session) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active text appointment session found'
                ], 404);
            }

            // Update activity
            $updateData = [
                'last_activity_time' => now(),
                'updated_at' => now(),
            ];

            if ($userType === 'patient') {
                $updateData['has_patient_activity'] = true;
            } else {
                $updateData['has_doctor_activity'] = true;
            }

            DB::table('text_appointment_sessions')
                ->where('id', $session->id)
                ->update($updateData);

            Log::info("Text appointment session activity updated", [
                'session_id' => $session->id,
                'appointment_id' => $appointmentId,
                'user_type' => $userType,
                'user_id' => $userId,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Activity updated successfully',
                'data' => [
                    'session_id' => $session->id,
                    'last_activity_time' => now(),
                ]
            ]);

        } catch (\Exception $e) {
            Log::error("Error updating text appointment session activity", [
                'error' => $e->getMessage(),
                'appointment_id' => $request->input('appointment_id'),
                'user_id' => auth()->id(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update activity: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Process session deduction for text appointment.
     */
    public function processDeduction(Request $request): JsonResponse
    {
        try {
            // Validate request
            $validator = Validator::make($request->all(), [
                'appointment_id' => 'required|integer|exists:appointments,id',
                'sessions_to_deduct' => 'required|integer|min:1',
                'reason' => 'required|string|in:interval,manual_end,no_activity',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $appointmentId = $request->input('appointment_id');
            $sessionsToDeduct = $request->input('sessions_to_deduct');
            $reason = $request->input('reason');

            // Get the appointment
            $appointment = Appointment::find($appointmentId);
            if (!$appointment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Appointment not found'
                ], 404);
            }

            // Get patient's subscription
            $subscription = Subscription::where('user_id', $appointment->patient_id)
                ->where('is_active', true)
                ->first();

            if (!$subscription) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active subscription found for patient'
                ], 400);
            }

            // Check if patient has enough sessions
            if ($subscription->text_sessions_remaining < $sessionsToDeduct) {
                return response()->json([
                    'success' => false,
                    'message' => 'Insufficient text sessions remaining'
                ], 400);
            }

            // Deduct sessions from subscription
            $subscription->decrement('text_sessions_remaining', $sessionsToDeduct);

            // Update session with deduction
            $session = DB::table('text_appointment_sessions')
                ->where('appointment_id', $appointmentId)
                ->where('is_active', true)
                ->first();

            if ($session) {
                DB::table('text_appointment_sessions')
                    ->where('id', $session->id)
                    ->update([
                        'sessions_used' => $session->sessions_used + $sessionsToDeduct,
                        'updated_at' => now(),
                    ]);
            }

            Log::info("Text appointment session deduction processed", [
                'appointment_id' => $appointmentId,
                'patient_id' => $appointment->patient_id,
                'sessions_deducted' => $sessionsToDeduct,
                'reason' => $reason,
                'remaining_sessions' => $subscription->text_sessions_remaining,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Session deduction processed successfully',
                'data' => [
                    'sessions_deducted' => $sessionsToDeduct,
                    'remaining_sessions' => $subscription->text_sessions_remaining,
                    'reason' => $reason,
                ]
            ]);

        } catch (\Exception $e) {
            Log::error("Error processing text appointment session deduction", [
                'error' => $e->getMessage(),
                'appointment_id' => $request->input('appointment_id'),
                'sessions_to_deduct' => $request->input('sessions_to_deduct'),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to process deduction: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * End text appointment session.
     */
    public function endSession(Request $request): JsonResponse
    {
        try {
            // Validate request
            $validator = Validator::make($request->all(), [
                'appointment_id' => 'required|integer|exists:appointments,id',
                'sessions_to_deduct' => 'required|integer|min:0',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $appointmentId = $request->input('appointment_id');
            $sessionsToDeduct = $request->input('sessions_to_deduct');
            $userId = auth()->id();

            // Get the appointment
            $appointment = Appointment::find($appointmentId);
            if (!$appointment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Appointment not found'
                ], 404);
            }

            // Verify user is part of this appointment
            if ($appointment->patient_id !== $userId && $appointment->doctor_id !== $userId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized access to appointment'
                ], 403);
            }

            // Get the session
            $session = DB::table('text_appointment_sessions')
                ->where('appointment_id', $appointmentId)
                ->where('is_active', true)
                ->first();

            if (!$session) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active text appointment session found'
                ], 404);
            }

            // Process deduction if needed
            if ($sessionsToDeduct > 0) {
                $subscription = Subscription::where('user_id', $appointment->patient_id)
                    ->where('is_active', true)
                    ->first();

                if ($subscription && $subscription->text_sessions_remaining >= $sessionsToDeduct) {
                    $subscription->decrement('text_sessions_remaining', $sessionsToDeduct);
                }
            }

            // End the session
            DB::table('text_appointment_sessions')
                ->where('id', $session->id)
                ->update([
                    'is_active' => false,
                    'is_ended' => true,
                    'sessions_used' => $session->sessions_used + $sessionsToDeduct,
                    'ended_at' => now(),
                    'updated_at' => now(),
                ]);

            Log::info("Text appointment session ended", [
                'session_id' => $session->id,
                'appointment_id' => $appointmentId,
                'patient_id' => $appointment->patient_id,
                'doctor_id' => $appointment->doctor_id,
                'sessions_deducted' => $sessionsToDeduct,
                'total_sessions_used' => $session->sessions_used + $sessionsToDeduct,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Text appointment session ended successfully',
                'data' => [
                    'session_id' => $session->id,
                    'is_ended' => true,
                    'sessions_deducted' => $sessionsToDeduct,
                    'total_sessions_used' => $session->sessions_used + $sessionsToDeduct,
                ]
            ]);

        } catch (\Exception $e) {
            Log::error("Error ending text appointment session", [
                'error' => $e->getMessage(),
                'appointment_id' => $request->input('appointment_id'),
                'user_id' => auth()->id(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to end session: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get text appointment session status.
     */
    public function getSessionStatus(Request $request, $appointmentId): JsonResponse
    {
        try {
            $userId = auth()->id();

            // Get the appointment
            $appointment = Appointment::find($appointmentId);
            if (!$appointment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Appointment not found'
                ], 404);
            }

            // Verify user is part of this appointment
            if ($appointment->patient_id !== $userId && $appointment->doctor_id !== $userId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized access to appointment'
                ], 403);
            }

            // Get the session
            $session = DB::table('text_appointment_sessions')
                ->where('appointment_id', $appointmentId)
                ->where('is_active', true)
                ->first();

            if (!$session) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'is_active' => false,
                        'is_ended' => false,
                        'message' => 'No active session found'
                    ]
                ]);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'session_id' => $session->id,
                    'is_active' => $session->is_active,
                    'is_ended' => $session->is_ended,
                    'start_time' => $session->start_time,
                    'last_activity_time' => $session->last_activity_time,
                    'has_patient_activity' => $session->has_patient_activity,
                    'has_doctor_activity' => $session->has_doctor_activity,
                    'sessions_used' => $session->sessions_used,
                ]
            ]);

        } catch (\Exception $e) {
            Log::error("Error getting text appointment session status", [
                'error' => $e->getMessage(),
                'appointment_id' => $appointmentId,
                'user_id' => auth()->id(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to get session status: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Parse appointment date and time to create a DateTime object.
     */
    private function parseAppointmentDateTime($dateStr, $timeStr)
    {
        try {
            if (!$dateStr || !$timeStr) {
                return null;
            }

            // Handle different date formats
            if (strpos($dateStr, '/') !== false) {
                // Format: MM/DD/YYYY
                $dateParts = explode('/', $dateStr);
                if (count($dateParts) === 3) {
                    $month = (int)$dateParts[0];
                    $day = (int)$dateParts[1];
                    $year = (int)$dateParts[2];
                    
                    // Handle time format (remove AM/PM if present)
                    $timeStr = preg_replace('/\s*(AM|PM)/i', '', $timeStr);
                    $timeParts = explode(':', $timeStr);
                    $hour = (int)$timeParts[0];
                    $minute = (int)$timeParts[1];
                    
                    return \Carbon\Carbon::create($year, $month, $day, $hour, $minute, 0);
                }
            } else {
                // Format: YYYY-MM-DD
                return \Carbon\Carbon::parse($dateStr . ' ' . $timeStr);
            }
        } catch (\Exception $e) {
            Log::error("Error parsing appointment date/time", [
                'date' => $dateStr,
                'time' => $timeStr,
                'error' => $e->getMessage()
            ]);
            return null;
        }
        
        return null;
    }
}
