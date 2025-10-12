<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\TextSession;

class TextSessionNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $textSession;
    protected $type;
    protected $message;

    /**
     * Create a new notification instance.
     */
    public function __construct(TextSession $textSession, string $type, string $message = null)
    {
        $this->textSession = $textSession;
        $this->type = $type;
        $this->message = $message;
    }

    /**
     * Get the notification's delivery channels.
     */
    public function via($notifiable): array
    {
        $channels = ['database'];
        
        if ($notifiable->push_notifications_enabled && $notifiable->push_token) {
            $channels[] = 'fcm';
        }

        return $channels;
    }

    /**
     * Get the FCM representation of the notification.
     */
    public function toFcm($notifiable): array
    {
        return [
            'notification' => [
                'title' => $this->getSubject(),
                'body' => $this->getContent(),
            ],
            'data' => [
                'type' => 'text_session',
                'session_id' => $this->textSession->id,
                'notification_type' => $this->type,
                'click_action' => 'OPEN_TEXT_SESSION',
            ],
        ];
    }

    /**
     * Get the array representation of the notification.
     */
    public function toArray($notifiable): array
    {
        return [
            'type' => 'text_session',
            'session_id' => $this->textSession->id,
            'notification_type' => $this->type,
            'title' => $this->getSubject(),
            'message' => $this->getContent(),
            'data' => [
                'session' => [
                    'id' => $this->textSession->id,
                    'status' => $this->textSession->status,
                    'started_at' => $this->textSession->started_at,
                    'ended_at' => $this->textSession->ended_at,
                    'sessions_used' => $this->textSession->sessions_used,
                ],
                'doctor' => [
                    'id' => $this->textSession->doctor->id,
                    'name' => $this->textSession->doctor->first_name . ' ' . $this->textSession->doctor->last_name,
                ],
                'patient' => [
                    'id' => $this->textSession->patient->id,
                    'name' => $this->textSession->patient->first_name . ' ' . $this->textSession->patient->last_name,
                ],
            ],
        ];
    }

    /**
     * Get notification subject based on type
     */
    protected function getSubject(): string
    {
        return match ($this->type) {
            'started' => 'Text Session Started',
            'ended' => 'Text Session Ended',
            'expired' => 'Text Session Expired',
            'new_message' => 'New Message',
            'session_warning' => 'Session Time Warning',
            default => 'Text Session Update',
        };
    }

    /**
     * Get notification content based on type
     */
    protected function getContent(): string
    {
        if ($this->message) {
            return $this->message;
        }

        $doctorName = $this->textSession->doctor->first_name . ' ' . $this->textSession->doctor->last_name;
        $patientName = $this->textSession->patient->first_name . ' ' . $this->textSession->patient->last_name;

        return match ($this->type) {
            'started' => "Your text session with Dr. {$doctorName} has started.",
            'ended' => "Your text session with Dr. {$doctorName} has ended.",
            'expired' => "Your text session with Dr. {$doctorName} has expired due to inactivity.",
            'new_message' => "You have a new message from your doctor.",
            'session_warning' => "Your text session will expire in 2 minutes due to inactivity.",
            default => "There's an update regarding your text session.",
        };
    }
}
