<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\TextSession;
use NotificationChannels\Fcm\FcmChannel;
use NotificationChannels\Fcm\FcmMessage;
use NotificationChannels\Fcm\Resources\AndroidConfig;
use NotificationChannels\Fcm\Resources\AndroidNotification;
use NotificationChannels\Fcm\Resources\ApnsConfig;
use NotificationChannels\Fcm\Resources\ApnsFcmOptions;

class ScheduledSessionActivated extends Notification implements ShouldQueue
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
        return [FcmChannel::class, 'database'];
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

    public function toFcm($notifiable)
    {
        $title = 'Scheduled Session Active';
        $body = "Your {$this->sessionTypeDisplay} with {$this->patientName} is now active. Tap to join.";

        return FcmMessage::create()
            ->setData([
                'type' => 'scheduled_session_activated',
                'session_id' => (string) $this->session->id,
                'session_type' => $this->session->session_type,
                'click_action' => 'FLUTTER_NOTIFICATION_CLICK',
            ])
            ->setNotification(
                \NotificationChannels\Fcm\Resources\Notification::create()
                    ->setTitle($title)
                    ->setBody($body)
            )
            ->setAndroid(
                AndroidConfig::create()
                    ->setFcmOptions(AndroidNotification::create()->setColor('#0A0A0A'))
                    ->setNotification(AndroidNotification::create()->setChannelId('appointments_channel'))
            )->setApns(
                ApnsConfig::create()
                    ->setFcmOptions(ApnsFcmOptions::create()->setAnalyticsLabel('analytics_ios'))
            );
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'scheduled_session_activated',
            'session_id' => $this->session->id,
            'session_type' => $this->session->session_type,
            'patient_name' => $this->patientName,
            'message' => "Your {$this->sessionTypeDisplay} with {$this->patientName} is now active.",
        ];
    }
}
