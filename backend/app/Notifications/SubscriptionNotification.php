<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\Subscription;

class SubscriptionNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $subscription;
    protected $type;
    protected $message;

    /**
     * Create a new notification instance.
     */
    public function __construct(Subscription $subscription, string $type, string $message = null)
    {
        $this->subscription = $subscription;
        $this->type = $type;
        $this->message = $message;
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
        $subject = $this->getSubject();
        $content = $this->getContent();

        return (new MailMessage)
            ->subject($subject)
            ->greeting("Hello {$notifiable->first_name},")
            ->line($content)
            ->action('View Subscription', url('/subscription'))
            ->line('Thank you for using DocAvailable!');
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
                'type' => 'subscription',
                'subscription_id' => $this->subscription->id,
                'notification_type' => $this->type,
                'click_action' => 'OPEN_SUBSCRIPTION',
            ],
        ];
    }

    /**
     * Get the array representation of the notification.
     */
    public function toArray($notifiable): array
    {
        $plan = $this->subscription->plan;

        return [
            'type' => 'subscription',
            'subscription_id' => $this->subscription->id,
            'notification_type' => $this->type,
            'title' => $this->getSubject(),
            'message' => $this->getContent(),
            'data' => [
                'subscription' => [
                    'id' => $this->subscription->id,
                    'plan_name' => $plan ? $plan->name : 'Unknown Plan',
                    'status' => $this->subscription->status,
                    'starts_at' => $this->subscription->starts_at,
                    'ends_at' => $this->subscription->ends_at,
                ],
                'plan' => $plan ? [
                    'id' => $plan->id,
                    'name' => $plan->name,
                    'price' => $plan->price,
                    'currency' => $plan->currency,
                    'text_sessions' => $plan->text_sessions,
                    'voice_calls' => $plan->voice_calls,
                    'video_calls' => $plan->video_calls,
                ] : null,
            ],
        ];
    }

    /**
     * Get notification subject based on type
     */
    protected function getSubject(): string
    {
        return match ($this->type) {
            'purchased' => '🎉 Subscription Activated!',
            'activated' => 'Subscription Activated',
            'renewed' => 'Subscription Renewed',
            'expiring_soon' => 'Subscription Expiring Soon',
            'expired' => 'Subscription Expired',
            'cancelled' => 'Subscription Cancelled',
            default => 'Subscription Update',
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

        $plan = $this->subscription->plan;
        $planName = $plan ? $plan->name : 'your plan';

        return match ($this->type) {
            'purchased' => "Congratulations! Your {$planName} subscription has been activated. Enjoy access to all your health benefits!",
            'activated' => "Your {$planName} subscription is now active. Start using your benefits today!",
            'renewed' => "Your {$planName} subscription has been successfully renewed. Thank you for staying with us!",
            'expiring_soon' => "Your {$planName} subscription will expire soon. Renew now to continue enjoying your benefits.",
            'expired' => "Your {$planName} subscription has expired. Renew to regain access to your health benefits.",
            'cancelled' => "Your {$planName} subscription has been cancelled. We're sorry to see you go.",
            default => "There's an update regarding your subscription.",
        };
    }
}
