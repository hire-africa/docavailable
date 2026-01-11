<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class WelcomeNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $userType;

    /**
     * Create a new notification instance.
     */
    public function __construct(string $userType = 'patient')
    {
        $this->userType = $userType;
    }

    /**
     * Get the notification's delivery channels.
     */
    public function via($notifiable): array
    {
        $channels = ['database'];

        if ($notifiable->email_notifications_enabled) {
            $channels[] = 'mail';
        }

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
        $greeting = $this->userType === 'doctor'
            ? "Welcome Dr. {$notifiable->first_name}!"
            : "Welcome {$notifiable->first_name}!";

        return (new MailMessage)
            ->subject('Welcome to DocAvailable! 🎉')
            ->greeting($greeting)
            ->line($this->getContent())
            ->action('Get Started', url('/'))
            ->line('If you have any questions, our support team is here to help!')
            ->line('Thank you for joining DocAvailable!');
    }

    /**
     * Get the FCM representation of the notification.
     */
    public function toFcm($notifiable): array
    {
        return [
            'notification' => [
                'title' => 'Welcome to DocAvailable! 🎉',
                'body' => $this->getContent(),
            ],
            'data' => [
                'type' => 'welcome',
                'notification_type' => 'welcome',
                'click_action' => 'OPEN_HOME',
            ],
        ];
    }

    /**
     * Get the array representation of the notification.
     */
    public function toArray($notifiable): array
    {
        return [
            'type' => 'welcome',
            'notification_type' => 'welcome',
            'title' => 'Welcome to DocAvailable! 🎉',
            'message' => $this->getContent(),
            'data' => [
                'user_type' => $this->userType,
                'user_name' => $notifiable->first_name . ' ' . $notifiable->last_name,
            ],
        ];
    }

    /**
     * Get notification content based on user type
     */
    protected function getContent(): string
    {
        if ($this->userType === 'doctor') {
            return "Welcome to DocAvailable! Your account is ready. You can now receive consultations from patients, manage appointments, and grow your practice. Let's make healthcare accessible together!";
        }

        return "Welcome to DocAvailable! Your account is ready. You can now book appointments with doctors, chat with healthcare professionals, and manage your health journey. We're here to help you stay healthy!";
    }
}
