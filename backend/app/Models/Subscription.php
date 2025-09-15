<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Subscription extends Model
{
    use HasFactory;

    protected $fillable = [
        'start_date',
        'end_date',
        'plan_id',
        'user_id',
        'status',
        'text_sessions_remaining',
        'appointments_remaining',
        'plan_name',
        'plan_price',
        'plan_currency',
        'voice_calls_remaining',
        'video_calls_remaining',
        'total_text_sessions',
        'total_voice_calls',
        'total_video_calls',
        'activated_at',
        'expires_at',
        'is_active',
        'payment_transaction_id',
        'payment_gateway',
        'payment_status',
        'payment_metadata'
    ];

    protected $casts = [
        'start_date' => 'datetime',
        'end_date' => 'datetime',
        'payment_metadata' => 'array',
    ];

    public function plan(){
        return $this->belongsTo(Plan::class);
    }

    public function user(){
        return $this->belongsTo(User::class);
    }

    /**
     * Check if subscription is active
     */
    public function getIsActiveAttribute(): bool
    {
        // First check the explicit is_active field
        if (isset($this->attributes['is_active'])) {
            return (bool) $this->attributes['is_active'];
        }
        
        // Fallback to checking status and end date
        return $this->status == 1 && 
               $this->end_date && 
               $this->end_date->isFuture();
    }

    /**
     * Check if subscription has expired
     */
    public function isExpired(): bool
    {
        return $this->end_date && $this->end_date->isPast();
    }

    /**
     * Get remaining days
     */
    public function getRemainingDays(): int
    {
        if (!$this->end_date) {
            return 0;
        }
        
        return max(0, Carbon::now()->diffInDays($this->end_date, false));
    }
}
