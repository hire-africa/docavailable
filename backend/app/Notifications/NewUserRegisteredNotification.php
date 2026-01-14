<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\User;

class NewUserRegisteredNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public $user;

    /**
     * Create a new notification instance.
     */
    public function __construct(User $user)
    {
        $this->user = $user;
    }

    /**
     * Get the notification's delivery channels.
     */
    public function via($notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('New User Registration - DocAvailable')
            ->greeting('Hello Admin,')
            ->line('A new user has registered on the platform.')
            ->line('**Name:** ' . $this->user->first_name . ' ' . $this->user->last_name)
            ->line('**Email:** ' . $this->user->email)
            ->line('**User Type:** ' . ucfirst($this->user->user_type))
            ->line('**Registered At:** ' . $this->user->created_at->format('Y-m-d H:i:s'))
            ->action('View User', url('/admin/users/' . $this->user->id))
            ->line('Please review their details if necessary.');
    }
}
