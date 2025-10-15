<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class PasswordResetCode extends Model
{
    use HasFactory;

    protected $fillable = [
        'email',
        'code',
        'expires_at',
        'used'
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'used' => 'boolean'
    ];

    /**
     * Generate a 6-digit reset code
     */
    public static function generateCode(): string
    {
        return str_pad(random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
    }

    /**
     * Create a new reset code for the given email
     */
    public static function createForEmail(string $email): self
    {
        // Invalidate any existing codes for this email
        self::where('email', $email)->delete();

        return self::create([
            'email' => $email,
            'code' => self::generateCode(),
            'expires_at' => now()->addMinutes(10) // 10 minutes expiry
        ]);
    }

    /**
     * Verify a reset code
     */
    public static function verifyCode(string $email, string $code): ?self
    {
        return self::where('email', $email)
            ->where('code', $code)
            ->where('used', false)
            ->where('expires_at', '>', now())
            ->first();
    }

    /**
     * Mark the code as used
     */
    public function markAsUsed(): void
    {
        $this->update(['used' => true]);
    }

    /**
     * Check if the code is expired
     */
    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    /**
     * Clean up expired codes (can be called via scheduler)
     */
    public static function cleanupExpired(): int
    {
        return self::where('expires_at', '<', now())->delete();
    }
}