<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PaymentTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'transaction_id',
        'reference',
        'amount',
        'currency',
        'status',
        'phone_number',
        'payment_method',
        'gateway',
        'webhook_data',
        'processed_at',
        'user_id',
        'gateway_reference',
        'metadata'
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'webhook_data' => 'array',
        'metadata' => 'array',
        'processed_at' => 'datetime'
    ];

    /**
     * Get the user associated with this payment
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the subscription associated with this payment
     */
    public function subscription()
    {
        return $this->hasOne(Subscription::class, 'payment_transaction_id', 'transaction_id');
    }

    /**
     * Scope for successful payments
     */
    public function scopeSuccessful($query)
    {
        return $query->where('status', 'completed');
    }

    /**
     * Scope for failed payments
     */
    public function scopeFailed($query)
    {
        return $query->where('status', 'failed');
    }

    /**
     * Scope for pending payments
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Check if payment is successful
     */
    public function isSuccessful(): bool
    {
        return $this->status === 'completed';
    }

    /**
     * Check if payment is failed
     */
    public function isFailed(): bool
    {
        return $this->status === 'failed';
    }

    /**
     * Check if payment is pending
     */
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    /**
     * Get formatted amount
     */
    public function getFormattedAmountAttribute(): string
    {
        return number_format($this->amount, 2) . ' ' . $this->currency;
    }

    /**
     * Get payment method display name
     */
    public function getPaymentMethodDisplayAttribute(): string
    {
        return match($this->payment_method) {
            'mobile_money' => 'Mobile Money',
            'bank_transfer' => 'Bank Transfer',
            'card' => 'Card Payment',
            default => ucfirst(str_replace('_', ' ', $this->payment_method))
        };
    }
} 