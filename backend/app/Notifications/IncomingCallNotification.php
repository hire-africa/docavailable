<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use App\Models\CallSession;
use App\Models\User;

class IncomingCallNotification extends Notification
{
    use Queueable;

    protected $callSession;
    protected $caller;

    public function __construct(CallSession $callSession, User $caller)
    {
        $this->callSession = $callSession;
        $this->caller = $caller;
    }

    public function via($notifiable): array
    {
        $channels = ['database'];
        if ($notifiable->push_notifications_enabled && $notifiable->push_token) {
            $channels[] = 'fcm';
        }
        return $channels;
    }

    public function toFcm($notifiable): array
    {
        $callerName = $this->getCallerDisplayName();
        $callType = $this->callSession->call_type === 'video' ? 'video' : 'audio';

        // ⚠️ CRITICAL: DATA-ONLY MESSAGE (no 'notification' block)
        // This ensures background handler ALWAYS runs, even when app is killed
        // CallKeep will display native UI instead of notification
        return [
            // NO 'notification' BLOCK - Let CallKeep handle UI
            'data' => [
                'type' => 'incoming_call',
                'isIncomingCall' => 'true',
                'appointment_id' => (string)($this->callSession->appointment_id ?? $this->callSession->id),
                'call_type' => $callType,
                'doctor_name' => $callerName,
                'doctorName' => $callerName,
                'caller_id' => (string)($this->caller->id ?? ''),
                'doctor_id' => (string)($this->callSession->doctor_id ?? ''),
                'doctor_profile_picture' => $this->caller->profile_picture_url ?? $this->caller->profile_picture ?? '',
                'doctorProfilePicture' => $this->caller->profile_picture_url ?? $this->caller->profile_picture ?? '',
                'call_session_id' => (string)$this->callSession->id,
                'started_at' => $this->callSession->started_at?->toIso8601String() ?? now()->toIso8601String(),
            ],
            'android' => [
                'priority' => 'high', // Ensures immediate delivery
            ],
            'apns' => [
                'payload' => [
                    'aps' => [
                        'alert' => [
                            'title' => $callerName . ' - ' . ($callType === 'video' ? 'Video Call' : 'Voice Call'),
                            'body' => 'Incoming call...',
                        ],
                        'sound' => 'default',
                        'badge' => 1,
                        'category' => 'incoming_call',
                        'mutable-content' => 1,
                    ],
                ],
            ],
        ];
    }

    public function toArray($notifiable): array
    {
        return [
            'type' => 'incoming_call',
            'call_session_id' => $this->callSession->id,
            'appointment_id' => $this->callSession->appointment_id,
            'call_type' => $this->callSession->call_type,
            'caller_id' => $this->caller->id,
            'caller_name' => $this->getCallerDisplayName(),
            'started_at' => $this->callSession->started_at,
        ];
    }

    private function getCallerDisplayName(): string
    {
        $fullName = trim(($this->caller->first_name ?? '') . ' ' . ($this->caller->last_name ?? ''));
        
        if ($this->caller->user_type === 'doctor' || $this->caller->role === 'doctor') {
            return 'Dr. ' . $fullName;
        }
        
        // For patients, return their full name or fallback to email
        return $fullName ?: ($this->caller->email ?? 'Patient');
    }
}