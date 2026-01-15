<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class DoctorApprovedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct()
    {
        //
    }

    /**
     * Get the notification's delivery channels.
     */
    public function via($notifiable): array
    {
        $channels = ['database'];

        // Add mail if user has email notifications enabled or is just newly approved doctor
        // Usually we want to send approval email regardless of settings to ensure they know they can start work
        $channels[] = 'mail';

        if ($notifiable->push_notifications_enabled && $notifiable->push_token) {
            $channels[] = 'fcm';
        }

        return $channels;
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Congratulations! Your DocAvailable Doctor Account is Approved 🎉')
            ->greeting("Hello Dr. {$notifiable->first_name}!")
            ->line('We are excited to inform you that your doctor account has been reviewed and approved by our medical board.')
            ->line('You can now log in to your dashboard to set your availability, respond to booking requests, and start providing consultations to patients.')
            ->action('Login to Dashboard', url('/'))
            ->line('We recommend starting by completing your profile details if you haven\'t already, as this helps patients choose the right specialist.')
            ->line('Welcome to the DocAvailable family!')
            ->line('Thank you for helping us make healthcare more accessible.');
    }

    /**
     * Get the FCM representation of the notification.
     */
    public function toFcm($notifiable): array
    {
        return [
            'notification' => [
                'title' => 'Account Approved! 🎉',
                'body' => 'Your doctor account has been approved. You can now start receiving appointments.',
            ],
            'data' => [
                'type' => 'doctor_approved',
                'notification_type' => 'doctor_approved',
                'click_action' => 'OPEN_DASHBOARD',
            ],
        ];
    }

    /**
     * Get the array representation of the notification.
     */
    public function toArray($notifiable): array
    {
        return [
            'type' => 'doctor_approved',
            'notification_type' => 'doctor_approved',
            'title' => 'Account Approved! 🎉',
            'message' => 'Your doctor account has been approved. You can now start receiving appointments.',
            'data' => [
                'doctor_id' => $notifiable->id,
                'doctor_name' => $notifiable->first_name . ' ' . $notifiable->last_name,
            ],
        ];
    }
}
