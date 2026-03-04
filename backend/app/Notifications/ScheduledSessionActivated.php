<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\TextSession;

class ScheduledSessionActivated extends Notification
{
    use Queueable;

    protected $session;
    protected $patientName;
    protected $sessionTypeDisplay;

    /**
     * Create a new notification instance.
     */
    public function __construct(TextSession $session, string $patientName, string $sessionTypeDisplay)
    {
        $this->session = $session;
        $this->patientName = $patientName;
        $this->sessionTypeDisplay = $sessionTypeDisplay;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        $channels = ['database'];
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
            ->line('The introduction to the notification.')
            ->action('Notification Action', url('/'))
            ->line('Thank you for using our application!');
    }

    public function toFcm($notifiable): array
    {
        $title = 'Scheduled Session Active';
        $body = "Your {$this->sessionTypeDisplay} with {$this->patientName} is now active. Tap to join.";
        $canonicalType = 'text_session_scheduled_activated';

        return [
            'notification' => [
                'title' => $title,
                'body' => $body,
            ],
            'data' => [
                'type' => $canonicalType,
                'notification_type' => 'scheduled_activated',
                'session_id' => (string) $this->session->id,
                'session_type' => $this->session->session_type,
                'click_action' => 'FLUTTER_NOTIFICATION_CLICK',
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
        $canonicalType = 'text_session_scheduled_activated';
        return [
            'type' => $canonicalType,
            'notification_type' => 'scheduled_activated',
            'session_id' => $this->session->id,
            'session_type' => $this->session->session_type,
            'patient_name' => $this->patientName,
            'message' => "Your {$this->sessionTypeDisplay} with {$this->patientName} is now active.",
        ];
    }
}
