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

    public function plan()
    {
        return $this->belongsTo(Plan::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function members()
    {
        return $this->hasMany(SubscriptionMember::class);
    }

    /**
     * Check if subscription is active
     */
    public function getIsActiveAttribute(): bool
    {
        // First, if explicitly deactivated in DB, it is not active
        if (isset($this->attributes['is_active']) && !(bool) $this->attributes['is_active']) {
            return false;
        }

        // If the end date has passed, it is no longer active at runtime
        if ($this->end_date && $this->end_date->isPast()) {
            return false;
        }

        return $this->status == 1; // 1 = active
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

    /**
     * Scope to get active subscriptions
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get subscriptions for a specific user
     */
    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Deactivate this subscription
     */
    public function deactivate()
    {
        $this->update(['is_active' => false]);
    }

    /**
     * Activate this subscription
     */
    public function activate()
    {
        $this->update(['is_active' => true]);
    }

    // ─── Stacking Helpers ────────────────────────────────────────────────

    /**
     * Get the oldest active subscription that still has remaining sessions
     * of the given type. Used for FIFO deduction.
     * Supports shared subscriptions for members.
     *
     * @param int    $userId
     * @param string $sessionType  'text' | 'voice' | 'video'
     * @return self|null
     */
    public static function getOldestActiveForDeduction(int $userId, string $sessionType): ?self
    {
        $field = match ($sessionType) {
            'voice' => 'voice_calls_remaining',
            'video' => 'video_calls_remaining',
            default => 'text_sessions_remaining',
        };

        $subscriptionIds = SubscriptionMember::where('user_id', $userId)
            ->where('status', 'active')
            ->pluck('subscription_id');

        return static::where(function($query) use ($userId, $subscriptionIds) {
                $query->where('user_id', $userId)
                      ->orWhereIn('id', $subscriptionIds);
            })
            ->where('is_active', true)
            ->where('status', 1)
            ->whereNotNull('end_date')
            ->where('end_date', '>', now())
            ->where($field, '>', 0)
            ->orderBy('start_date', 'asc')   // oldest first
            ->orderBy('id', 'asc')
            ->first();
    }

    /**
     * Get aggregated remaining sessions across all active subscriptions.
     * Used for API display so the user sees a single combined total.
     * Supports shared subscriptions for members.
     *
     * @param int $userId
     * @return array{text_sessions_remaining: int, voice_calls_remaining: int, video_calls_remaining: int, subscriptions: \Illuminate\Support\Collection}
     */
    public static function getAggregatedSessions(int $userId): array
    {
        $subscriptionIds = SubscriptionMember::where('user_id', $userId)
            ->where('status', 'active')
            ->pluck('subscription_id');

        $subs = static::where(function($query) use ($userId, $subscriptionIds) {
                $query->where('user_id', $userId)
                      ->orWhereIn('id', $subscriptionIds);
            })
            ->where('is_active', true)
            ->where('status', 1)
            ->whereNotNull('end_date')
            ->where('end_date', '>', now())
            ->orderBy('start_date', 'asc')
            ->get();

        return [
            'text_sessions_remaining' => $subs->sum('text_sessions_remaining'),
            'voice_calls_remaining' => $subs->sum('voice_calls_remaining'),
            'video_calls_remaining' => $subs->sum('video_calls_remaining'),
            'total_text_sessions' => $subs->sum('total_text_sessions'),
            'total_voice_calls' => $subs->sum('total_voice_calls'),
            'total_video_calls' => $subs->sum('total_video_calls'),
            'subscriptions' => $subs,
        ];
    }

    /**
     * Get total remaining sessions of a given type across all active subscriptions.
     * Supports shared subscriptions for members.
     *
     * @param int    $userId
     * @param string $sessionType 'text' | 'voice' | 'video'
     * @return int
     */
    public static function getTotalRemaining(int $userId, string $sessionType): int
    {
        $field = match ($sessionType) {
            'voice' => 'voice_calls_remaining',
            'video' => 'video_calls_remaining',
            default => 'text_sessions_remaining',
        };

        $subscriptionIds = SubscriptionMember::where('user_id', $userId)
            ->where('status', 'active')
            ->pluck('subscription_id');

        return (int) static::where(function($query) use ($userId, $subscriptionIds) {
                $query->where('user_id', $userId)
                      ->orWhereIn('id', $subscriptionIds);
            })
            ->where('is_active', true)
            ->where('status', 1)
            ->whereNotNull('end_date')
            ->where('end_date', '>', now())
            ->sum($field);
    }
}
