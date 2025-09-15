<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Reviews extends Model
{
    protected $fillable = [
        'user_id',
        'doctor_id',
        'patient_id',
        'reviewer_id',
        'rating',
        'comment',
        'chat_id',
        'status',
    ];

    public function user(){
        return $this->belongsTo(User::class);
    }

    public function doctor(){
        return $this->belongsTo(User::class, 'doctor_id');
    }

    public function patient(){
        return $this->belongsTo(User::class, 'patient_id');
    }

    public function reviewer(){
        return $this->belongsTo(User::class, 'reviewer_id');
    }
}
