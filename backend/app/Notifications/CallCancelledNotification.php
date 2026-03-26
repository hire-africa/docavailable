<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use App\Models\CallSession;
use App\Models\User;

/**
 * Notification sent to the peer (usually doctor) when a call is cancelled
 * by the caller before connection.
 */
class CallCancelledNotification extends Notification
{
    use Queueable;

    protected $callSession;
    protected $caller;

    /**
     * Create a new notification instance.
     */
    public function __construct(CallSession $callSession, User $caller)
    {
        $this->callSession = $callSession;
        $this->caller = $caller;
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
        $callerName = trim($this->caller->first_name . ' ' . $this->caller->last_name);
        if (empty($callerName))
            $callerName = "Patient #{$this->caller->id}";

        return [
            'title' => 'Call Cancelled',
            'body' => "The call from {$callerName} has ended.",
            'data' => [
                'type' => 'call_cancelled',
                'notification_type' => 'cancelled',
                'call_session_id' => (string) $this->callSession->id,
                'appointment_id' => (string) $this->callSession->appointment_id,
                'call_type' => $this->callSession->call_type,
                'caller_id' => (string) $this->caller->id,
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
        $callerName = trim($this->caller->first_name . ' ' . $this->caller->last_name);
        if (empty($callerName))
            $callerName = "Patient #{$this->caller->id}";

        return [
            'type' => 'call_cancelled',
            'notification_type' => 'cancelled',
            'call_session_id' => $this->callSession->id,
            'appointment_id' => $this->callSession->appointment_id,
            'call_type' => $this->callSession->call_type,
            'caller_id' => $this->caller->id,
            'caller_name' => $callerName,
            'message' => "The call from {$callerName} has ended.",
            'timestamp' => now()->toISOString(),
        ];
    }
}
