<?php

namespace App\Observers;

use App\Models\CallSession;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class CallSessionObserver
{
    /**
     * Handle the CallSession "created" event.
     */
    public function created(CallSession $callSession): void
    {
        try {
            // Only for voice/video connecting/waiting sessions
            if (!in_array($callSession->call_type, [CallSession::CALL_TYPE_VOICE, CallSession::CALL_TYPE_VIDEO])) {
                return;
            }
            if (!in_array($callSession->status, [CallSession::STATUS_CONNECTING, CallSession::STATUS_WAITING_FOR_DOCTOR])) {
                return;
            }

            // Basic fields must be present
            if (empty($callSession->doctor_id) || empty($callSession->patient_id)) {
                Log::warning('CallSessionObserver: Missing doctor_id or patient_id; skipping notification', [
                    'call_session_id' => $callSession->id,
                    'doctor_id' => $callSession->doctor_id,
                    'patient_id' => $callSession->patient_id,
                ]);
                return;
            }

            // Debounce: avoid duplicate notifications if controller already sent
            try {
                $recent = DB::table('notifications')
                    ->where('notifiable_id', $callSession->doctor_id)
                    ->where('type', 'App\\Notifications\\IncomingCallNotification')
                    ->whereBetween('created_at', [now()->subSeconds(15), now()->addSeconds(1)])
                    ->where('data->call_session_id', (string)$callSession->id)
                    ->exists();
                if ($recent) {
                    Log::info('CallSessionObserver: Recent IncomingCallNotification already exists; skipping duplicate', [
                        'call_session_id' => $callSession->id,
                        'doctor_id' => $callSession->doctor_id,
                    ]);
                    return;
                }
            } catch (\Throwable $t) {
                Log::warning('CallSessionObserver: Failed to check recent notifications (continuing)', [
                    'error' => $t->getMessage(),
                ]);
            }

            $doctor = User::find($callSession->doctor_id);
            $caller = User::find($callSession->patient_id);

            if (!$doctor || !$caller) {
                Log::warning('CallSessionObserver: Doctor or caller not found; skipping notification', [
                    'call_session_id' => $callSession->id,
                    'doctor_id' => $callSession->doctor_id,
                    'patient_id' => $callSession->patient_id,
                ]);
                return;
            }

            Log::info('CallSessionObserver: Dispatching IncomingCallNotification for created session', [
                'call_session_id' => $callSession->id,
                'doctor_id' => $doctor->id,
                'caller_id' => $caller->id,
                'call_type' => $callSession->call_type,
                'appointment_id' => $callSession->appointment_id,
                'doctor_has_token' => !empty($doctor->push_token),
            ]);

            // Dispatch notification (FCM + database channels as configured)
            $notification = new \App\Notifications\IncomingCallNotification($callSession, $caller);
            $doctor->notify($notification);

            // Best-effort: also notify web clients via WebSocket notification channel
            try {
                $baseUrl = rtrim(env('WEBRTC_NOTIFICATION_BROADCAST_URL', env('WEBRTC_CHAT_SERVER_URL', 'https://docavailable.org')), '/');
                $endpoint = $baseUrl . '/broadcast-incoming-call';

                $callerName = trim(($caller->first_name ?? '') . ' ' . ($caller->last_name ?? ''));
                if ($callerName === '') {
                    $callerName = $caller->email ?? 'Patient';
                }

                $callerAvatar = $caller->profile_picture_url ?? $caller->profile_picture ?? '';

                $payload = [
                    'receiverUserId' => (string) $doctor->id,
                    'appointmentId' => (string) $callSession->appointment_id,
                    'callType' => $callSession->call_type === CallSession::CALL_TYPE_VIDEO ? 'video' : 'audio',
                    'callerName' => $callerName,
                    'callerProfilePicture' => $callerAvatar,
                    'callerId' => (string) $caller->id,
                ];

                $response = Http::timeout(2)
                    ->withHeaders(['Content-Type' => 'application/json'])
                    ->post($endpoint, $payload);

                Log::info('CallSessionObserver: WebSocket incoming-call broadcast attempted', [
                    'endpoint' => $endpoint,
                    'status' => $response->status(),
                    'receiver_user_id' => $doctor->id,
                ]);
            } catch (\Throwable $t) {
                Log::warning('CallSessionObserver: Failed to broadcast incoming-call to WebSocket server (non-fatal)', [
                    'call_session_id' => $callSession->id,
                    'error' => $t->getMessage(),
                ]);
            }
        } catch (\Throwable $e) {
            Log::error('CallSessionObserver: Failed to auto-send IncomingCallNotification', [
                'call_session_id' => $callSession->id ?? null,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
