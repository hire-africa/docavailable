<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\Appointment;

class AppointmentExpiredNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $appointment;
    protected $reason;

    /**
     * Create a new notification instance.
     */
    public function __construct(Appointment $appointment, string $reason)
    {
        $this->appointment = $appointment;
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
                    ->line('Your appointment has expired.')
                    ->line('Reason: ' . $this->reason)
                    ->line('No sessions have been deducted from your account.')
                    ->action('Book New Appointment', url('/'))
                    ->line('Thank you for using our application!');
    }

    /**
     * Get the FCM representation of the notification.
     */
    public function toFcm(object $notifiable): array
    {
        return [
            'title' => 'Appointment Expired',
            'body' => 'Your appointment has expired. ' . $this->reason,
            'data' => [
                'type' => 'appointment_expired',
                'appointment_id' => $this->appointment->id,
                'doctor_id' => $this->appointment->doctor_id,
                'appointment_type' => $this->appointment->appointment_type,
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
            'type' => 'appointment_expired',
            'appointment_id' => $this->appointment->id,
            'doctor_id' => $this->appointment->doctor_id,
            'doctor_name' => $this->appointment->doctor ? 
                ($this->appointment->doctor->first_name . ' ' . $this->appointment->doctor->last_name) : 
                'Unknown Doctor',
            'appointment_type' => $this->appointment->appointment_type,
            'scheduled_time' => $this->appointment->appointment_datetime_utc ?? 
                "{$this->appointment->appointment_date} {$this->appointment->appointment_time}",
            'reason' => $this->reason,
            'message' => 'Your appointment has expired. ' . $this->reason,
            'timestamp' => now()->toISOString(),
        ];
    }
}
