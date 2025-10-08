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
        $channels = ['database'];
        // Optional: still send email if you want
        // $channels[] = 'mail';
        if (isset($notifiable->push_notifications_enabled) && isset($notifiable->push_token) && $notifiable->push_notifications_enabled && !empty($notifiable->push_token)) {
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
            ->subject('New Message in Text Session')
            ->greeting('Hello ' . $notifiable->first_name . '!')
            ->line('You have received a new message in your text session.')
            ->line('From: ' . $this->data['sender_name'])
            ->line('Message: ' . $this->data['message_preview'])
            ->action('View Session', url('/text-sessions/' . $this->data['session_id']))
            ->line('Thank you for using DocAvailable!');
    }

    /**
     * Get the FCM representation of the notification.
     */
    public function toFcm($notifiable): array
    {
        $senderName = $this->data['sender_name'] ?? 'Unknown';
        $sessionId = $this->data['session_id'] ?? '';
        // Use appointment_id as the unified key the client expects
        $appointmentId = is_string($sessionId) && str_starts_with($sessionId, 'text_session_')
            ? $sessionId
            : 'text_session_' . $sessionId;

        return [
            'title' => "New message from {$senderName}",
            'body' => 'You have a new message',
            'data' => [
                'type' => 'chat_message',
                'appointment_id' => (string)$appointmentId,
                'sender_name' => $senderName,
                'message_count' => '1',
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