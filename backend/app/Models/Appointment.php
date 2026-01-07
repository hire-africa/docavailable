<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Services\DoctorPaymentService;

class Appointment extends Model
{
    use HasFactory;

    protected $fillable = [
        'patient_id',
        'doctor_id',
        'appointment_date',
        'appointment_time',
        'appointment_datetime_utc',    // Add new UTC datetime field
        'user_timezone',               // Add user timezone field
        'appointment_type',
        'duration_minutes',
        'status',
        'reason',
        'reschedule_proposed_date',
        'reschedule_proposed_time',
        'reschedule_reason',
        'reschedule_proposed_by',
        'reschedule_status',
        'patient_joined',
        'doctor_joined',
        'cancelled_reason'
    ];

    // Appointment status constants
    const STATUS_PENDING = 0;
    const STATUS_CONFIRMED = 1;
    const STATUS_CANCELLED = 2;
    const STATUS_COMPLETED = 3;
    const STATUS_RESCHEDULE_PROPOSED = 4;
    const STATUS_RESCHEDULE_ACCEPTED = 5;
    const STATUS_RESCHEDULE_REJECTED = 6;
    const STATUS_IN_PROGRESS = 7;

    // Reschedule status constants
    const RESCHEDULE_PENDING = 0;
    const RESCHEDULE_ACCEPTED = 1;
    const RESCHEDULE_REJECTED = 2;

    // Appointment type constants
    const TYPE_TEXT = 'text';
    const TYPE_AUDIO = 'audio';
    const TYPE_VIDEO = 'video';

    public function patient()
    {
        return $this->belongsTo(User::class, 'patient_id');
    }

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }

    public function proposedBy()
    {
        return $this->belongsTo(User::class, 'reschedule_proposed_by');
    }

    /**
     * Mark appointment as completed and process payment
     */
    public function markAsCompleted(): array
    {
        $this->update(['status' => self::STATUS_COMPLETED]);

        // Process payment and deduction using the comprehensive service
        $paymentService = new DoctorPaymentService();
        return $paymentService->processAppointmentEnd($this);
    }

    /**
     * Check if appointment is completed
     */
    public function isCompleted(): bool
    {
        return $this->status === self::STATUS_COMPLETED;
    }

    /**
     * Get appointment type display name
     */
    public function getAppointmentTypeDisplayAttribute(): string
    {
        return match ($this->appointment_type) {
            self::TYPE_TEXT => 'Text Session',
            self::TYPE_AUDIO => 'Audio Call',
            self::TYPE_VIDEO => 'Video Call',
            default => 'Unknown'
        };
    }

    /**
     * Get normalized status value (convert string to numeric if needed)
     */
    public function getNormalizedStatusAttribute(): int
    {
        if (is_numeric($this->status)) {
            return (int) $this->status;
        }

        // Convert string status to numeric
        return match (strtolower($this->status)) {
            'pending' => self::STATUS_PENDING,
            'confirmed' => self::STATUS_CONFIRMED,
            'cancelled' => self::STATUS_CANCELLED,
            'completed' => self::STATUS_COMPLETED,
            'reschedule_proposed' => self::STATUS_RESCHEDULE_PROPOSED,
            'reschedule_accepted' => self::STATUS_RESCHEDULE_ACCEPTED,
            'reschedule_rejected' => self::STATUS_RESCHEDULE_REJECTED,
            'in_progress' => self::STATUS_IN_PROGRESS,
            default => self::STATUS_PENDING
        };
    }

    /**
     * Check if appointment can be deleted
     */
    public function canBeDeleted(): bool
    {
        $normalizedStatus = $this->normalized_status;
        return in_array($normalizedStatus, [self::STATUS_PENDING, self::STATUS_CANCELLED]);
    }

    /**
     * Get appointment datetime in user's timezone
     */
    public function getLocalDateTimeAttribute()
    {
        if ($this->appointment_datetime_utc && $this->user_timezone) {
            return \App\Services\TimezoneService::convertFromUTC(
                \Carbon\Carbon::parse($this->appointment_datetime_utc),
                $this->user_timezone
            );
        }

        // Fallback to old format for backward compatibility
        return \Carbon\Carbon::parse($this->appointment_date . ' ' . $this->appointment_time);
    }

    /**
     * Get appointment time in user's timezone for display
     */
    public function getLocalTimeAttribute()
    {
        $localDateTime = $this->local_date_time;
        return $localDateTime->format('H:i');
    }

    /**
     * Get appointment date in user's timezone for display
     */
    public function getLocalDateAttribute()
    {
        $localDateTime = $this->local_date_time;
        return $localDateTime->format('Y-m-d');
    }
}
