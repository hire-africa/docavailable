<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TextSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'patient_id',
        'doctor_id',
        'status',
        'started_at',
        'ended_at',
        'last_activity_at',
        'sessions_used',
        'sessions_remaining_before_start',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
        'last_activity_at' => 'datetime',
    ];

    // Status constants
    const STATUS_ACTIVE = 'active';
    const STATUS_ENDED = 'ended';
    const STATUS_EXPIRED = 'expired';
    const STATUS_WAITING_FOR_DOCTOR = 'waiting_for_doctor';

    /**
     * Get the patient that owns the text session.
     */
    public function patient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'patient_id');
    }

    /**
     * Get the doctor that owns the text session.
     */
    public function doctor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }

    /**
     * Check if the session is active.
     */
    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    /**
     * Check if the session has expired.
     */
    public function isExpired(): bool
    {
        return $this->status === self::STATUS_EXPIRED;
    }

    /**
     * Check if the session is waiting for doctor response.
     */
    public function isWaitingForDoctor(): bool
    {
        return $this->status === self::STATUS_WAITING_FOR_DOCTOR;
    }

    /**
     * Update the last activity timestamp.
     */
    public function updateLastActivity(): void
    {
        $this->update(['last_activity_at' => now()]);
    }

    /**
     * End the session.
     */
    public function endSession(): void
    {
        $this->update([
            'status' => self::STATUS_ENDED,
            'ended_at' => now(),
        ]);
    }

    /**
     * Expire the session.
     */
    public function expireSession(): void
    {
        $this->update([
            'status' => self::STATUS_EXPIRED,
            'ended_at' => now(),
        ]);
    }

    /**
     * Get the total duration of the session in minutes.
     */
    public function getTotalDurationMinutes(): int
    {
        if (!$this->started_at) {
            return 0;
        }

        $endTime = $this->ended_at ?? now();
        $duration = $this->started_at->diffInMinutes($endTime);
        
        return max(1, $duration); // Minimum 1 minute
    }

    /**
     * Get total allowed minutes based on sessions remaining before start
     */
    public function getTotalAllowedMinutes(): int
    {
        return $this->sessions_remaining_before_start * 10;
    }

    /**
     * Get elapsed minutes since session started
     */
    public function getElapsedMinutes(): int
    {
        if (!$this->started_at) {
            return 0;
        }
        $endTime = $this->ended_at ?? now();
        return $this->started_at->diffInMinutes($endTime);
    }

    /**
     * Calculate sessions to deduct based on elapsed time
     * Auto-deductions happen at 10-minute intervals
     * Manual end always adds 1 session
     */
    public function getSessionsToDeduct(bool $isManualEnd = false): int
    {
        $elapsedMinutes = $this->getElapsedMinutes();
        
        // Calculate auto-deductions (every 10 minutes)
        $autoDeductions = floor($elapsedMinutes / 10);
        
        // Manual end always adds 1 session
        $manualDeduction = $isManualEnd ? 1 : 0;
        
        return $autoDeductions + $manualDeduction;
    }

    /**
     * Check if session should auto-end based on total time
     */
    public function shouldAutoEnd(): bool
    {
        $elapsedMinutes = $this->getElapsedMinutes();
        $totalAllowedMinutes = $this->getTotalAllowedMinutes();
        return $elapsedMinutes >= $totalAllowedMinutes;
    }

    /**
     * Get the next auto-deduction time
     */
    public function getNextAutoDeductionTime(): ?\Carbon\Carbon
    {
        if (!$this->started_at) {
            return null;
        }
        
        $elapsedMinutes = $this->getElapsedMinutes();
        $nextDeductionMinute = ceil($elapsedMinutes / 10) * 10;
        
        return $this->started_at->addMinutes($nextDeductionMinute);
    }

    /**
     * Get time remaining until next auto-deduction
     */
    public function getTimeUntilNextDeduction(): int
    {
        $elapsedMinutes = $this->getElapsedMinutes();
        $nextDeductionMinute = ceil($elapsedMinutes / 10) * 10;
        return max(0, $nextDeductionMinute - $elapsedMinutes);
    }
} 