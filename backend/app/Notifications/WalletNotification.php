<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\WalletTransaction;

class WalletNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $transaction;
    protected $type;
    protected $message;

    /**
     * Create a new notification instance.
     */
    public function __construct(WalletTransaction $transaction, string $type, string $message = null)
    {
        $this->transaction = $transaction;
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
            ->greeting("Hello Dr. {$notifiable->first_name},")
            ->line($content)
            ->action('View Wallet', url('/doctor/wallet'))
            ->line('Thank you for using DocAvailable!');
    }

    /**
     * Get the FCM representation of the notification.
     */
    public function toFcm($notifiable): array
    {
        return [
            'title' => $this->getSubject(),
            'body' => $this->getContent(),
            'data' => [
                'type' => 'wallet',
                'transaction_id' => $this->transaction->id,
                'notification_type' => $this->type,
                'click_action' => 'OPEN_WALLET',
            ],
        ];
    }

    /**
     * Get the array representation of the notification.
     */
    public function toArray($notifiable): array
    {
        return [
            'type' => 'wallet',
            'transaction_id' => $this->transaction->id,
            'notification_type' => $this->type,
            'title' => $this->getSubject(),
            'message' => $this->getContent(),
            'data' => [
                'transaction' => [
                    'id' => $this->transaction->id,
                    'type' => $this->transaction->type,
                    'amount' => $this->transaction->amount,
                    'description' => $this->transaction->description,
                    'status' => $this->transaction->status,
                    'created_at' => $this->transaction->created_at,
                ],
                'wallet' => [
                    'balance' => $this->transaction->wallet->balance,
                    'total_earned' => $this->transaction->wallet->total_earned,
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
            'payment_received' => 'Payment Received',
            'withdrawal_requested' => 'Withdrawal Requested',
            'withdrawal_processed' => 'Withdrawal Processed',
            'withdrawal_failed' => 'Withdrawal Failed',
            'bonus_received' => 'Bonus Received',
            default => 'Wallet Update',
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

        $amount = number_format($this->transaction->amount, 2);
        $description = $this->transaction->description;

        return match ($this->type) {
            'payment_received' => "You have received MWK {$amount} for {$description}.",
            'withdrawal_requested' => "Your withdrawal request for MWK {$amount} has been submitted and is being processed.",
            'withdrawal_processed' => "Your withdrawal of MWK {$amount} has been processed successfully.",
            'withdrawal_failed' => "Your withdrawal request for MWK {$amount} has failed. Please contact support.",
            'bonus_received' => "You have received a bonus of MWK {$amount} for {$description}.",
            default => "There's an update regarding your wallet.",
        };
    }
}
