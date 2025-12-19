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
        'reason',
        'chat_id',
        'max_duration_minutes',
        'doctor_response_deadline',
        'activated_at',
        'auto_deductions_processed',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
        'last_activity_at' => 'datetime',
        'doctor_response_deadline' => 'datetime',
        'activated_at' => 'datetime',
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
     * Get the messages for the text session.
     * NOTE: Messages are stored in cache via MessageStorageService, not in the database.
     * This relationship is kept for backwards compatibility but should not be used for queries.
     */
    public function messages(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        // Messages are stored in cache, not database, so this relationship should not be used
        // Keeping it for backwards compatibility but it will fail if chat_room_id column doesn't exist
        // Use MessageStorageService::getMessages() instead
        return $this->hasMany(ChatMessage::class, 'chat_room_id');
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
     * Get elapsed minutes since activation (not start)
     */
    public function getElapsedMinutes(): int
    {
        if (!$this->activated_at) {
            return 0; // Session not activated yet
        }

        $endTime = $this->ended_at ?? now();
        return $this->activated_at->diffInMinutes($endTime);
    }

    /**
     * Get total allowed minutes based on sessions remaining when session was created
     */
    public function getTotalAllowedMinutes(): int
    {
        // Use the sessions remaining when the session was created
        // This ensures consistency even if subscription changes during the session
        return $this->sessions_remaining_before_start * 10; // 10 minutes per session
    }

    /**
     * Check if session should auto-end based on total time from activation
     */
    public function shouldAutoEnd(): bool
    {
        $elapsedMinutes = $this->getElapsedMinutes();
        $totalAllowedMinutes = $this->getTotalAllowedMinutes();
        return $elapsedMinutes >= $totalAllowedMinutes;
    }

    /**
     * Get the next auto-deduction time (from activation point)
     */
    public function getNextAutoDeductionTime(): ?\Carbon\Carbon
    {
        if (!$this->activated_at) {
            return null; // Session not activated yet
        }

        $elapsedMinutes = $this->getElapsedMinutes();
        $nextDeductionMinute = ceil($elapsedMinutes / 10) * 10;

        return $this->activated_at->addMinutes($nextDeductionMinute);
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

    /**
     * Get remaining time in minutes for the session (from activation point)
     * FIXED: Added 1-minute buffer to allow auto-deductions to process
     */
    public function getRemainingTimeMinutes(): int
    {
        $totalAllowedMinutes = $this->getTotalAllowedMinutes();
        $elapsedMinutes = $this->getElapsedMinutes();
        $bufferMinutes = 1; // 1-minute buffer to allow auto-deductions to process

        return max(0, ($totalAllowedMinutes + $bufferMinutes) - $elapsedMinutes);
    }

    /**
     * Get remaining sessions count (based on activation time)
     */
    public function getRemainingSessions(): int
    {
        $elapsedMinutes = $this->getElapsedMinutes();
        $sessionsUsed = floor($elapsedMinutes / 10);
        return max(0, $this->sessions_remaining_before_start - $sessionsUsed);
    }

    /**
     * Check if session has run out of time (from activation point)
     * FIXED: Added 1-minute buffer to allow auto-deductions to process
     */
    public function hasRunOutOfTime(): bool
    {
        $totalAllowedMinutes = $this->getTotalAllowedMinutes();
        $elapsedMinutes = $this->getElapsedMinutes();
        $bufferMinutes = 1; // 1-minute buffer to allow auto-deductions to process

        return ($totalAllowedMinutes + $bufferMinutes) - $elapsedMinutes <= 0;
    }

    /**
     * Check if session should be auto-ended due to insufficient sessions
     */
    public function shouldAutoEndDueToInsufficientSessions(): bool
    {
        $patient = $this->patient;
        if (!$patient || !$patient->subscription) {
            return true; // No subscription, auto-end
        }

        $subscription = $patient->subscription;
        if (!$subscription->isActive) {
            return true; // Inactive subscription, auto-end
        }

        // Check if we have enough sessions for the next 10-minute block
        $elapsedMinutes = $this->getElapsedMinutes();
        $nextDeductionMinute = ceil($elapsedMinutes / 10) * 10;
        $sessionsNeededForNextBlock = 1; // 1 session per 10 minutes

        return $subscription->text_sessions_remaining < $sessionsNeededForNextBlock;
    }

    /**
     * Get detailed session status for debugging
     */
    public function getSessionStatusDetails(): array
    {
        return [
            'session_id' => $this->id,
            'status' => $this->status,
            'started_at' => $this->started_at,
            'activated_at' => $this->activated_at,
            'ended_at' => $this->ended_at,
            'elapsed_minutes' => $this->getElapsedMinutes(),
            'total_allowed_minutes' => $this->getTotalAllowedMinutes(),
            'remaining_time_minutes' => $this->getRemainingTimeMinutes(),
            'sessions_remaining_before_start' => $this->sessions_remaining_before_start,
            'sessions_used' => $this->sessions_used,
            'auto_deductions_processed' => $this->auto_deductions_processed,
            'remaining_sessions' => $this->getRemainingSessions(),
            'has_run_out_of_time' => $this->hasRunOutOfTime(),
            'should_auto_end' => $this->shouldAutoEnd(),
            'should_auto_end_insufficient_sessions' => $this->shouldAutoEndDueToInsufficientSessions(),
            'next_deduction_time' => $this->getNextAutoDeductionTime(),
            'time_until_next_deduction' => $this->getTimeUntilNextDeduction(),
        ];
    }

    /**
     * Activate the session (called when doctor sends first message)
     */
    public function activate(): void
    {
        $this->update([
            'status' => self::STATUS_ACTIVE,
            'activated_at' => now(),
            'last_activity_at' => now()
        ]);

        // Scheduler will handle auto-deductions - no queue jobs needed
        \Illuminate\Support\Facades\Log::info("Text session activated", [
            'session_id' => $this->id,
            'activated_at' => $this->activated_at,
            'total_allowed_minutes' => $this->getTotalAllowedMinutes()
        ]);
    }

    /**
     * Get sessions to deduct when ending session
     * Accounts for auto-deductions that have already been processed
     */
    public function getSessionsToDeduct(bool $isManualEnd = true): int
    {
        $elapsedMinutes = $this->getElapsedMinutes();
        
        // Calculate total sessions needed based on elapsed time
        // Every 10 minutes = 1 session, plus 1 for manual end
        $totalSessionsNeeded = floor($elapsedMinutes / 10);
        if ($isManualEnd) {
            $totalSessionsNeeded += 1; // Add 1 for manual end
        }
        
        // Subtract what's already been auto-deducted
        $alreadyProcessed = $this->auto_deductions_processed ?? 0;
        $sessionsToDeduct = max(0, $totalSessionsNeeded - $alreadyProcessed);
        
        \Illuminate\Support\Facades\Log::info("Calculating sessions to deduct", [
            'session_id' => $this->id,
            'elapsed_minutes' => $elapsedMinutes,
            'total_sessions_needed' => $totalSessionsNeeded,
            'already_processed' => $alreadyProcessed,
            'sessions_to_deduct' => $sessionsToDeduct,
            'is_manual_end' => $isManualEnd
        ]);
        
        return $sessionsToDeduct;
    }

    /**
     * Handle manual session ending with atomic operations
     */
    public function endManually($reason = 'manual_end'): bool
    {
        return \Illuminate\Support\Facades\DB::transaction(function () use ($reason) {
            $session = self::lockForUpdate()->find($this->id);

            if (!$session || $session->status !== self::STATUS_ACTIVE) {
                return false;
            }

            // Preserve the original reason if it exists, otherwise use the provided reason
            $finalReason = $session->reason && $session->reason !== 'manual_end' ? $session->reason : $reason;

            // Calculate sessions to deduct (accounts for auto-deductions)
            $sessionsToDeduct = $session->getSessionsToDeduct(true);
            
            // Update session status first
            $session->update([
                'status' => self::STATUS_ENDED,
                'ended_at' => now(),
                'reason' => $finalReason,
                'sessions_used' => $session->sessions_used + $sessionsToDeduct
            ]);

            \Illuminate\Support\Facades\Log::info("Session ended manually", [
                'session_id' => $this->id,
                'original_reason' => $session->reason,
                'final_reason' => $finalReason,
                'sessions_to_deduct' => $sessionsToDeduct,
                'total_sessions_used' => $session->sessions_used
            ]);

            return true;
        });
    }
}