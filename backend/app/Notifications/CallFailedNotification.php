<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\CallSession;

class CallFailedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $callSession;
    protected $reason;

    /**
     * Create a new notification instance.
     */
    public function __construct(CallSession $callSession, string $reason)
    {
        $this->callSession = $callSession;
        $this->reason = $reason;
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
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
                    ->line('Your call could not be connected.')
                    ->line('Reason: ' . $this->reason)
                    ->line('No sessions have been deducted from your account.')
                    ->action('Try Again', url('/'))
                    ->line('Thank you for using our application!');
    }

    /**
     * Get the FCM representation of the notification.
     */
    public function toFcm(object $notifiable): array
    {
        return [
            'title' => 'Call Failed',
            'body' => 'Your call could not be connected. No sessions were deducted.',
            'data' => [
                'type' => 'call_failed',
                'call_session_id' => $this->callSession->id,
                'appointment_id' => $this->callSession->appointment_id,
                'call_type' => $this->callSession->call_type,
                'reason' => $this->reason,
                'timestamp' => now()->toISOString(),
            ],
        ];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'call_failed',
            'call_session_id' => $this->callSession->id,
            'appointment_id' => $this->callSession->appointment_id,
            'call_type' => $this->callSession->call_type,
            'reason' => $this->reason,
            'message' => 'Your call could not be connected. No sessions were deducted.',
            'timestamp' => now()->toISOString(),
        ];
    }
}
