<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class DoctorRejectedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $reason;

    /**
     * Create a new notification instance.
     */
    public function __construct(?string $reason = null)
    {
        $this->reason = $reason;
    }

    /**
     * Get the notification's delivery channels.
     */
    public function via($notifiable): array
    {
        return ['mail', 'database'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail($notifiable): MailMessage
    {
        $message = (new MailMessage)
            ->subject('Update regarding your DocAvailable Doctor Account')
            ->greeting("Hello Dr. {$notifiable->first_name},")
            ->line('Thank you for your interest in joining DocAvailable.')
            ->line('After reviewing your application and documents, we regret to inform you that we cannot approve your doctor account at this time.');

        if ($this->reason) {
            $message->line('Reason for rejection: ' . $this->reason);
        } else {
            $message->line('This is usually due to incomplete documentation or verification issues.');
        }

        return $message
            ->line('You can review your documents and resubmit your application if you believe this was an error.')
            ->action('View My Profile', url('/'))
            ->line('Thank you for your understanding.');
    }

    /**
     * Get the array representation of the notification.
     */
    public function toArray($notifiable): array
    {
        return [
            'type' => 'doctor_rejected',
            'notification_type' => 'doctor_rejected',
            'title' => 'Account Update',
            'message' => 'Your doctor account application was not approved. Please check your email for details.',
            'data' => [
                'reason' => $this->reason,
            ],
        ];
    }
}
