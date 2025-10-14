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

        return [
            'notification' => [
                'title' => $callType === 'video' ? 'Incoming video call' : 'Incoming voice call',
                'body' => $callerName . ' is calling…',
            ],
            'data' => [
                'type' => 'incoming_call',
                'appointment_id' => (string)($this->callSession->appointment_id ?? $this->callSession->id),
                'call_type' => $callType,
                'doctor_name' => $callerName,
                'doctorName' => $callerName, // Frontend expects this field name
                'caller_id' => (string)($this->caller->id ?? ''),
                'doctor_id' => (string)($this->callSession->doctor_id ?? ''),
                'doctor_profile_picture' => $this->caller->profile_picture_url ?? $this->caller->profile_picture ?? '',
                'doctorProfilePicture' => $this->caller->profile_picture_url ?? $this->caller->profile_picture ?? '', // Frontend expects this field name
                'isIncomingCall' => 'true',
                'click_action' => 'OPEN_CALL',
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