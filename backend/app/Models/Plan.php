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

    public function subscriptions()
    {
        return $this->hasMany(Subscription::class);
    }
}
