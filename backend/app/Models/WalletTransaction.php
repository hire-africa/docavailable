<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WalletTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'doctor_id',
        'type',
        'amount',
        'description',
        'session_type',
        'session_id',
        'session_table',
        'status',
        'metadata',
        'payment_transaction_id',
        'payment_gateway',
        'payment_status'
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'metadata' => 'array',
    ];

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }

    public function wallet()
    {
        return $this->belongsTo(DoctorWallet::class, 'doctor_id', 'doctor_id');
    }

    /**
     * Scope for credit transactions (earnings)
     */
    public function scopeCredits($query)
    {
        return $query->where('type', 'credit');
    }

    /**
     * Scope for debit transactions (withdrawals)
     */
    public function scopeDebits($query)
    {
        return $query->where('type', 'debit');
    }

    /**
     * Scope for completed transactions
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    /**
     * Get formatted amount with currency
     */
    public function getFormattedAmountAttribute()
    {
        return 'MWK ' . number_format($this->amount, 2);
    }

    /**
     * Get session type display name
     */
    public function getSessionTypeDisplayAttribute()
    {
        return match($this->session_type) {
            'text' => 'Text Session',
            'audio' => 'Audio Call',
            'video' => 'Video Call',
            default => 'Unknown'
        };
    }
} 