<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\Appointment;

class AppointmentActivated extends Notification implements ShouldQueue
{
    use Queueable;

    protected $appointment;
    protected $otherPartyName;
    protected $appointmentTypeDisplay;
    protected $recipientType; // 'patient' or 'doctor'

    /**
     * Create a new notification instance.
     */
    public function __construct(Appointment $appointment, string $otherPartyName, string $appointmentTypeDisplay, string $recipientType)
    {
        $this->appointment = $appointment;
        $this->otherPartyName = $otherPartyName;
        $this->appointmentTypeDisplay = $appointmentTypeDisplay;
        $this->recipientType = $recipientType;
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
        $title = 'Appointment Now Active';
        $canonicalType = 'appointment_activated';

        if ($this->recipientType === 'patient') {
            $body = "Your {$this->appointmentTypeDisplay} appointment with {$this->otherPartyName} is now active. Tap to join.";
        } else {
            $body = "Your {$this->appointmentTypeDisplay} appointment with {$this->otherPartyName} is now active. Tap to start the session.";
        }

        return [
            'notification' => [
                'title' => $title,
                'body' => $body,
            ],
            'data' => [
                'type' => $canonicalType,
                'notification_type' => 'activated',
                'appointment_id' => (string) $this->appointment->id,
                'appointment_type' => $this->appointment->appointment_type,
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
        $canonicalType = 'appointment_activated';
        return [
            'type' => $canonicalType,
            'notification_type' => 'activated',
            'appointment_id' => $this->appointment->id,
            'appointment_type' => $this->appointment->appointment_type,
            'other_party_name' => $this->otherPartyName,
            'message' => "Your {$this->appointmentTypeDisplay} appointment with {$this->otherPartyName} is now active.",
        ];
    }
}
