<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use App\Models\CallSession;
use App\Models\User;

/**
 * Notification sent to patient when doctor declines their call.
 */
class CallDeclinedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $callSession;
    protected $doctor;

    /**
     * Create a new notification instance.
     */
    public function __construct(CallSession $callSession, User $doctor)
    {
        $this->callSession = $callSession;
        $this->doctor = $doctor;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        $channels = ['database'];

        // Add FCM if user has push notifications enabled
        if ($notifiable->push_notifications_enabled && !empty($notifiable->push_token)) {
            $channels[] = 'fcm';
        }

        return $channels;
    }

    /**
     * Get the FCM representation of the notification.
     */
    public function toFcm(object $notifiable): array
    {
        $doctorName = $this->doctor->first_name . ' ' . $this->doctor->last_name;

        return [
            'title' => 'Call Declined',
            'body' => "Dr. {$doctorName} is not available right now. Please try again later.",
            'data' => [
                'type' => 'call_declined',
                'call_session_id' => (string) $this->callSession->id,
                'appointment_id' => (string) $this->callSession->appointment_id,
                'call_type' => $this->callSession->call_type,
                'doctor_id' => (string) $this->doctor->id,
                'timestamp' => now()->toISOString(),
            ],
        ];
    }

    /**
     * Get the array representation of the notification (for database channel).
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $doctorName = $this->doctor->first_name . ' ' . $this->doctor->last_name;

        return [
            'type' => 'call_declined',
            'call_session_id' => $this->callSession->id,
            'appointment_id' => $this->callSession->appointment_id,
            'call_type' => $this->callSession->call_type,
            'doctor_id' => $this->doctor->id,
            'doctor_name' => $doctorName,
            'message' => "Dr. {$doctorName} is not available right now.",
            'timestamp' => now()->toISOString(),
        ];
    }
}
