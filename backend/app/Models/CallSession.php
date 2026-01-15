<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CallSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'patient_id',
        'doctor_id',
        'call_type',
        'appointment_id', // ⚠️ SEMANTIC NOTE: This is a session routing key, not necessarily a DB appointment row.
                          // For instant calls, this is 'direct_session_{timestamp}'. For scheduled calls,
                          // this may reference an appointments.id, but billing is still session-event-driven
                          // (connected_at, duration, call end), not appointment-time-driven.
        'status',
        'started_at',
        'ended_at',
        'last_activity_at',
        'reason',
        'sessions_used',
        'sessions_remaining_before_start',
        'is_connected',
        'call_duration',
        'auto_deductions_processed',
        'failure_reason',
        'answered_at',
        'answered_by',
        'declined_at',
        'declined_by',
        'decline_reason',
        'connected_at',
        'manual_deduction_applied',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
        'last_activity_at' => 'datetime',
        'answered_at' => 'datetime',
        'declined_at' => 'datetime',
        'connected_at' => 'datetime',
        'is_connected' => 'boolean',
        'call_duration' => 'integer',
    ];

    // Status constants
    const STATUS_ACTIVE = 'active';
    const STATUS_ENDED = 'ended';
    const STATUS_EXPIRED = 'expired';
    const STATUS_WAITING_FOR_DOCTOR = 'waiting_for_doctor';
    const STATUS_CONNECTING = 'connecting';
    const STATUS_PENDING = 'pending';
    const STATUS_ANSWERED = 'answered';
    const STATUS_DECLINED = 'declined';
    const STATUS_FAILED = 'failed';

    // Call type constants
    const CALL_TYPE_VOICE = 'voice';
    const CALL_TYPE_VIDEO = 'video';

    /**
     * Get the patient that owns the call session.
     */
    public function patient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'patient_id');
    }

    /**
     * Get the doctor that owns the call session.
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
     * Check if the session is connecting.
     */
    public function isConnecting(): bool
    {
        return $this->status === self::STATUS_CONNECTING;
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
     * Mark session as connected.
     * CRITICAL: Uses answered_at as connected_at (not now()) to ensure billing correctness
     * This ensures connected_at is set to when the call was actually answered, not when promotion happened
     * INVARIANT: connected_at is written ONLY ONCE and never overwritten
     */
    public function markAsConnected(): void
    {
        // CRITICAL: Only set if not already set (idempotent)
        if ($this->connected_at) {
            return;
        }
        
        // Use answered_at as connected_at (not now()) for billing correctness
        // This ensures billing duration is calculated from when call was answered, not when promotion job ran
        $connectedAt = $this->answered_at ?? now();
        
        $this->update([
            'status' => self::STATUS_ACTIVE,
            'is_connected' => true,
            'connected_at' => $connectedAt,
        ]);
    }
}
