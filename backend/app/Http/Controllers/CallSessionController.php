<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Subscription;
use App\Models\CallSession;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CallSessionController extends Controller
{
    /**
     * Check if user can make a call (voice or video)
     */
    public function checkAvailability(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }

            $callType = $request->input('call_type');
            if (!in_array($callType, ['voice', 'video'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid call type. Must be voice or video'
                ], 400);
            }

            // Get user's subscription
            $subscription = Subscription::where('user_id', $user->id)->first();
            
            if (!$subscription) {
                return response()->json([
                    'success' => false,
                    'can_make_call' => false,
                    'message' => 'No subscription found. Please subscribe to make calls.',
                    'remaining_calls' => 0
                ]);
            }

            if (!$subscription->is_active) {
                return response()->json([
                    'success' => false,
                    'can_make_call' => false,
                    'message' => 'Your subscription is not active. Please renew to make calls.',
                    'remaining_calls' => 0
                ]);
            }

            // Check remaining calls based on type
            $remainingCalls = 0;
            $callTypeField = $callType === 'voice' ? 'voiceCallsRemaining' : 'videoCallsRemaining';
            $remainingCalls = $subscription->$callTypeField ?? 0;

            if ($remainingCalls <= 0) {
                return response()->json([
                    'success' => false,
                    'can_make_call' => false,
                    'message' => "No remaining {$callType} calls in your subscription. Please upgrade or wait for renewal.",
                    'remaining_calls' => $remainingCalls
                ]);
            }

            Log::info("Call availability checked", [
                'user_id' => $user->id,
                'call_type' => $callType,
                'remaining_calls' => $remainingCalls,
                'subscription_active' => $subscription->is_active
            ]);

            return response()->json([
                'success' => true,
                'can_make_call' => true,
                'message' => "You have {$remainingCalls} {$callType} calls remaining",
                'remaining_calls' => $remainingCalls,
                'subscription' => [
                    'textSessionsRemaining' => $subscription->textSessionsRemaining,
                    'voiceCallsRemaining' => $subscription->voiceCallsRemaining,
                    'videoCallsRemaining' => $subscription->videoCallsRemaining,
                    'isActive' => $subscription->isActive
                ]
            ]);

        } catch (\Exception $e) {
            Log::error("Error checking call availability", [
                'user_id' => Auth::id(),
                'call_type' => $request->input('call_type'),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'can_make_call' => false,
                'message' => 'Failed to check call availability. Please try again.',
                'remaining_calls' => 0
            ], 500);
        }
    }

    /**
     * Start a call session
     */
    public function start(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }

            $callType = $request->input('call_type');
            $appointmentId = $request->input('appointment_id');
            $reason = $request->input('reason');

            if (!in_array($callType, ['voice', 'video'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid call type. Must be voice or video'
                ], 400);
            }

            if (!$appointmentId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Appointment ID is required'
                ], 400);
            }

            // Check availability first
            $availabilityResponse = $this->checkAvailability($request);
            $availabilityData = $availabilityResponse->getData(true);
            
            if (!$availabilityData['success'] || !$availabilityData['can_make_call']) {
                return $availabilityResponse;
            }

            // Get subscription for remaining sessions count
            $subscription = Subscription::where('user_id', $user->id)->first();
            $callTypeField = $callType === 'voice' ? 'voiceCallsRemaining' : 'videoCallsRemaining';
            $sessionsRemainingBeforeStart = $subscription->$callTypeField;

            // For direct sessions, we need to find a doctor
            $doctorId = null;
            if (str_starts_with($appointmentId, 'direct_session_')) {
                // For direct sessions, we need to find an available doctor
                // For now, we'll use a placeholder - in a real implementation,
                // you'd want to find an available doctor based on the user's selection
                $doctorId = $request->input('doctor_id');
                if (!$doctorId) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Doctor ID is required for direct sessions'
                    ], 400);
                }
            } else {
                // For regular appointments, get doctor from appointment
                // This would require querying the appointments table
                // For now, we'll assume the appointment ID contains the doctor info
                $doctorId = $request->input('doctor_id');
                if (!$doctorId) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Doctor ID is required'
                    ], 400);
                }
            }

            // Check if there's already an active call session
            $existingSession = CallSession::where('patient_id', $user->id)
                ->where('doctor_id', $doctorId)
                ->whereIn('status', [CallSession::STATUS_ACTIVE, CallSession::STATUS_CONNECTING, CallSession::STATUS_WAITING_FOR_DOCTOR])
                ->first();

            if ($existingSession) {
                return response()->json([
                    'success' => false,
                    'message' => 'You already have an active call session with this doctor'
                ], 400);
            }

            // Create call session record
            $callSession = CallSession::create([
                'patient_id' => $user->id,
                'doctor_id' => $doctorId,
                'call_type' => $callType,
                'appointment_id' => $appointmentId,
                'status' => CallSession::STATUS_CONNECTING,
                'started_at' => now(),
                'last_activity_at' => now(),
                'reason' => $reason,
                'sessions_used' => 1,
                'sessions_remaining_before_start' => $sessionsRemainingBeforeStart,
                'is_connected' => false,
                'call_duration' => 0,
            ]);

            // Deduct one call from subscription
            $subscription->$callTypeField = max(0, $subscription->$callTypeField - 1);
            $subscription->save();

            Log::info("Call session started", [
                'user_id' => $user->id,
                'call_session_id' => $callSession->id,
                'call_type' => $callType,
                'appointment_id' => $appointmentId,
                'doctor_id' => $doctorId,
                'remaining_calls' => $subscription->$callTypeField
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Call session started successfully',
                'data' => [
                    'session_id' => $callSession->id,
                    'appointment_id' => $appointmentId,
                    'call_type' => $callType,
                    'status' => $callSession->status,
                    'started_at' => $callSession->started_at->toISOString(),
                ],
                'remaining_calls' => $subscription->$callTypeField,
                'call_type' => $callType,
                'appointment_id' => $appointmentId
            ]);

        } catch (\Exception $e) {
            Log::error("Error starting call session", [
                'user_id' => Auth::id(),
                'call_type' => $request->input('call_type'),
                'appointment_id' => $request->input('appointment_id'),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to start call session. Please try again.'
            ], 500);
        }
    }

    /**
     * End a call session
     */
    public function end(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }

            $callType = $request->input('call_type');
            $appointmentId = $request->input('appointment_id');
            $sessionDuration = $request->input('session_duration', 0);
            $wasConnected = $request->input('was_connected', false);

            Log::info("Call session ended", [
                'user_id' => $user->id,
                'call_type' => $callType,
                'appointment_id' => $appointmentId,
                'session_duration' => $sessionDuration,
                'was_connected' => $wasConnected
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Call session ended successfully',
                'session_duration' => $sessionDuration,
                'was_connected' => $wasConnected
            ]);

        } catch (\Exception $e) {
            Log::error("Error ending call session", [
                'user_id' => Auth::id(),
                'call_type' => $request->input('call_type'),
                'appointment_id' => $request->input('appointment_id'),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to end call session'
            ], 500);
        }
    }

    /**
     * Process call deduction (for periodic billing)
     */
    public function deduction(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }

            $callType = $request->input('call_type');
            $appointmentId = $request->input('appointment_id');
            $sessionDuration = $request->input('session_duration', 0);

            // For now, just log the deduction
            // In a real implementation, you might want to track usage or apply additional charges
            Log::info("Call deduction processed", [
                'user_id' => $user->id,
                'call_type' => $callType,
                'appointment_id' => $appointmentId,
                'session_duration' => $sessionDuration
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Call deduction processed successfully',
                'session_duration' => $sessionDuration
            ]);

        } catch (\Exception $e) {
            Log::error("Error processing call deduction", [
                'user_id' => Auth::id(),
                'call_type' => $request->input('call_type'),
                'appointment_id' => $request->input('appointment_id'),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to process call deduction'
            ], 500);
        }
    }
}
