<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WithdrawalCompletedMail extends Mailable
{
    use Queueable, SerializesModels;

    public $doctorName;
    public $amount;
    public $paymentMethod;
    public $bankName;
    public $accountHolderName;
    public $completedAt;

    /**
     * Create a new message instance.
     */
    public function __construct($doctorName, $amount, $paymentMethod, $bankName, $accountHolderName, $completedAt)
    {
        $this->doctorName = $doctorName;
        $this->amount = $amount;
        $this->paymentMethod = $paymentMethod;
        $this->bankName = $bankName;
        $this->accountHolderName = $accountHolderName;
        $this->completedAt = $completedAt;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Withdrawal Request Completed - DocAvailable',
            from: new \Illuminate\Mail\Mailables\Address(
                config('mail.from.address'),
                'DocAvailable'
            ),
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.withdrawal.completed',
            with: [
                'doctorName' => $this->doctorName,
                'amount' => $this->amount,
                'paymentMethod' => $this->paymentMethod,
                'bankName' => $this->bankName,
                'accountHolderName' => $this->accountHolderName,
                'completedAt' => $this->completedAt,
                'appName' => config('app.name', 'DocAvailable'),
            ],
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
