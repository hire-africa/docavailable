<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DoctorPaymentMethod extends Model
{
    use HasFactory;

    protected $fillable = [
        'doctor_id',
        'type',
        'provider',
        'label',
        'holder_name',
        'details',
        'is_primary',
    ];

    protected $casts = [
        'details' => 'array',
        'is_primary' => 'boolean',
    ];

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }
}

