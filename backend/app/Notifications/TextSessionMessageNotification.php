<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\DatabaseMessage;

class TextSessionMessageNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $data;

    /**
     * Create a new notification instance.
     */
    public function __construct($data)
    {
        $this->data = $data;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('New Message in Text Session')
            ->greeting('Hello ' . $notifiable->first_name . '!')
            ->line('You have received a new message in your text session.')
            ->line('From: ' . $this->data['sender_name'])
            ->line('Message: ' . $this->data['message_preview'])
            ->action('View Session', url('/text-sessions/' . $this->data['session_id']))
            ->line('Thank you for using DocAvailable!');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'text_session_message',
            'session_id' => $this->data['session_id'],
            'sender_name' => $this->data['sender_name'],
            'message_preview' => $this->data['message_preview'],
            'message_id' => $this->data['message_id'],
            'title' => 'New Message in Text Session',
            'body' => $this->data['sender_name'] . ' sent you a message: ' . $this->data['message_preview'],
        ];
    }

    /**
     * Get the database representation of the notification.
     */
    public function toDatabase(object $notifiable): array
    {
        return [
            'type' => 'text_session_message',
            'session_id' => $this->data['session_id'],
            'sender_name' => $this->data['sender_name'],
            'message_preview' => $this->data['message_preview'],
            'message_id' => $this->data['message_id'],
            'title' => 'New Message in Text Session',
            'body' => $this->data['sender_name'] . ' sent you a message: ' . $this->data['message_preview'],
        ];
    }
} 