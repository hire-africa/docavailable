<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use App\Models\User;
use App\Models\Appointment;

class ChatMessageNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $sender;
    protected $appointment;
    protected $message;
    protected $messageId;

    /**
     * Create a new notification instance.
     */
    public function __construct(User $sender, Appointment $appointment, string $message, string $messageId)
    {
        $this->sender = $sender;
        $this->appointment = $appointment;
        $this->message = $message;
        $this->messageId = $messageId;
    }

    /**
     * Get the notification's delivery channels.
     */
    public function via($notifiable): array
    {
        $channels = ['database'];
        
        // Only send push notifications for chat messages
        if ($notifiable->push_notifications_enabled && $notifiable->push_token) {
            $channels[] = 'fcm';
        }

        return $channels;
    }

    /**
     * Get the FCM representation of the notification (PRIVACY-FIRST - NO MESSAGE CONTENT).
     */
    public function toFcm($notifiable): array
    {
        $senderName = $this->getSenderDisplayName();
        
        // SECURE: Only send notification triggers, NOT message content
        return [
            'notification' => [
                'title' => "New message from {$senderName}",
                'body' => "You have a new message", // Generic message - no content for privacy
                'sound' => 'default',
                'badge' => 1,
            ],
            'data' => [
                'type' => 'chat_message',
                'appointment_id' => (string) $this->appointment->id,
                'sender_name' => $senderName,
                'message_count' => '1', // Just indicate there's a new message
                'timestamp' => now()->toISOString(),
                'click_action' => 'OPEN_CHAT', // Add click action for frontend handling
                // NO MESSAGE CONTENT - PRIVACY FIRST
            ],
        ];
    }

    /**
     * Get the array representation of the notification.
     */
    public function toArray($notifiable): array
    {
        return [
            'type' => 'chat_message',
            'appointment_id' => $this->appointment->id,
            'message_id' => $this->messageId,
            'sender_id' => $this->sender->id,
            'sender_name' => $this->getSenderDisplayName(),
            'message' => $this->message,
            'appointment_date' => $this->appointment->appointment_date,
        ];
    }

    /**
     * Get sender display name
     */
    private function getSenderDisplayName(): string
    {
        if ($this->sender->role === 'doctor') {
            return "Dr. {$this->sender->first_name} {$this->sender->last_name}";
        }
        
        return "{$this->sender->first_name} {$this->sender->last_name}";
    }

    /**
     * Truncate message for notification
     */
    private function truncateMessage(string $message): string
    {
        if (strlen($message) <= 100) {
            return $message;
        }
        
        return substr($message, 0, 97) . '...';
    }
} 