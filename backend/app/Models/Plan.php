<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Plan extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'features',
        'currency',
        'price',
        'duration',
        'status',
        'text_sessions',
        'voice_calls',
        'video_calls'
    ];

    protected $casts = [
        'features' => 'array'
    ];

    // Add default values for missing fields
    protected $attributes = [
        'text_sessions' => 0,
        'voice_calls' => 0,
        'video_calls' => 0,
        'duration' => 30,
        'status' => 1,
    ];

    public function subscriptions()
    {
        return $this->hasMany(Subscription::class);
    }
}
