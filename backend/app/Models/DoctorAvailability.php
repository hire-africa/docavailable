<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DoctorAvailability extends Model
{
    use HasFactory;

    protected $fillable = [
        'doctor_id',
        'is_online',
        'working_hours',
        'last_active_at',
        'manually_offline',
        'manually_online',
        'max_patients_per_day',
        'auto_accept_appointments',
    ];

    protected $casts = [
        'is_online' => 'boolean',
        'working_hours' => 'array',
        'last_active_at' => 'datetime',
        'manually_offline' => 'boolean',
        'manually_online' => 'boolean',
        'max_patients_per_day' => 'integer',
        'auto_accept_appointments' => 'boolean',
    ];

    /**
     * Get the doctor that owns the availability
     */
    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }
} 