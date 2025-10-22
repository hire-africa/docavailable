<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Tymon\JWTAuth\Contracts\JWTSubject;
use App\Traits\HasImageUrls;

class User extends Authenticatable implements JWTSubject
{
    use HasApiTokens, HasFactory, Notifiable, HasImageUrls;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'email',
        'password',
        'first_name',
        'last_name',
        'display_name',
        'profile_picture',
        'user_type',
        'date_of_birth',
        'gender',
        'country',
        'city',
        'years_of_experience',
        'specialization',
        'sub_specialization',
        'specializations',
        'sub_specializations',
        'languages_spoken',
        'bio',
        'health_history',
        'status',
        'rating',
        'total_ratings',
        'firebase_uid', // Keep for migration if needed
        'google_id', // Google OAuth ID
        'national_id',
        'medical_degree',
        'medical_licence',
        'professional_bio',
        'is_online_for_instant_sessions',
        'last_online_at',
        'is_active',
        'public_key',
        'private_key',
        'encryption_enabled',
        'push_token',
        'notification_preferences',
        'privacy_preferences',
        'email_notifications_enabled',
        'push_notifications_enabled',
        'sms_notifications_enabled',
        'id_document',
        'address_proof',
        'selfie_verification',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'private_key',
    ];

    /**
     * Get the identifier that will be stored in the subject claim of the JWT.
     *
     * @return mixed
     */
    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    /**
     * Return a key value array, containing any custom claims to be added to the JWT.
     *
     * @return array
     */
    public function getJWTCustomClaims()
    {
        return [
            'user_type' => $this->user_type,
            'email' => $this->email,
            'display_name' => $this->display_name,
        ];
    }

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'date_of_birth' => 'date:Y-m-d',
        'rating' => 'float',
        'total_ratings' => 'integer',
        'years_of_experience' => 'integer',
        'is_online_for_instant_sessions' => 'boolean',
        'is_active' => 'boolean',
        'last_online_at' => 'datetime',
        'encryption_enabled' => 'boolean',
        'email_notifications_enabled' => 'boolean',
        'push_notifications_enabled' => 'boolean',
        'sms_notifications_enabled' => 'boolean',
        'privacy_preferences' => 'array',
        'notification_preferences' => 'array',
        'specializations' => 'array',
        'sub_specializations' => 'array',
        'languages_spoken' => 'array',
    ];

    // Debug method to check languages_spoken
    public function getLanguagesSpokenAttribute($value)
    {
        \Log::info('🔍 [User Model] languages_spoken raw value:', ['value' => $value, 'type' => gettype($value)]);
        
        if (is_null($value)) {
            return null;
        }
        
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            \Log::info('🔍 [User Model] languages_spoken decoded:', ['decoded' => $decoded]);
            return $decoded;
        }
        
        return $value;
    }

    /**
     * Get the user's full name.
     */
    public function getFullNameAttribute()
    {
        return "{$this->first_name} {$this->last_name}";
    }

    /**
     * Check if user is a doctor.
     */
    public function isDoctor()
    {
        return $this->user_type === 'doctor';
    }

    /**
     * Check if user is a patient.
     */
    public function isPatient()
    {
        return $this->user_type === 'patient';
    }

    /**
     * Check if user is an admin.
     */
    public function isAdmin()
    {
        return $this->user_type === 'admin';
    }

    /**
     * Check if user is approved.
     */
    public function isApproved()
    {
        return $this->status === 'approved';
    }

    /**
     * Check if user has a specific role.
     */
    public function hasRole($role)
    {
        return $this->user_type === $role;
    }

    /**
     * Check if user has any of the specified roles.
     */
    public function hasAnyRole($roles)
    {
        return in_array($this->user_type, (array) $roles);
    }

    /**
     * Get user's appointments.
     */
    public function appointments()
    {
        return $this->hasMany(Appointment::class, 'patient_id');
    }

    /**
     * Get doctor's appointments.
     */
    public function doctorAppointments()
    {
        return $this->hasMany(Appointment::class, 'doctor_id');
    }

    /**
     * Get user's subscription.
     */
    public function subscription()
    {
        return $this->hasOne(Subscription::class)->orderBy('is_active', 'desc')->orderBy('created_at', 'desc');
    }

    /**
     * Get user's subscriptions (all of them).
     */
    public function subscriptions()
    {
        return $this->hasMany(Subscription::class)->orderBy('is_active', 'desc')->orderBy('created_at', 'desc');
    }

    /**
     * Get user's active subscription.
     */
    public function activeSubscription()
    {
        return $this->hasOne(Subscription::class)->where('is_active', true);
    }

    /**
     * Get doctor's wallet.
     */
    public function wallet()
    {
        return $this->hasOne(DoctorWallet::class, 'doctor_id');
    }

    /**
     * Get doctor's availability settings.
     */
    public function doctorAvailability()
    {
        return $this->hasOne(DoctorAvailability::class, 'doctor_id');
    }

    /**
     * Get user's notifications.
     */
    public function notifications()
    {
        return $this->morphMany(\Illuminate\Notifications\DatabaseNotification::class, 'notifiable')->orderBy('created_at', 'desc');
    }

    /**
     * Get user's notification preferences.
     */
    public function notificationPreferences()
    {
        return $this->hasMany(NotificationPreference::class);
    }

    /**
     * Get chat rooms where user is a participant.
     */
    public function chatRooms()
    {
        return $this->belongsToMany(ChatRoom::class, 'chat_room_participants', 'user_id', 'chat_room_id')
                    ->withPivot('role')
                    ->withTimestamps();
    }

    /**
     * Get messages sent by user.
     */
    public function messages()
    {
        return $this->hasMany(ChatMessage::class, 'sender_id');
    }

    /**
     * Get text sessions where user is the patient.
     */
    public function textSessions()
    {
        return $this->hasMany(TextSession::class, 'patient_id');
    }

    /**
     * Get text sessions where user is the doctor.
     */
    public function doctorTextSessions()
    {
        return $this->hasMany(TextSession::class, 'doctor_id');
    }

    /**
     * Get call sessions where user is the patient.
     */
    public function callSessions()
    {
        return $this->hasMany(CallSession::class, 'patient_id');
    }

    /**
     * Get call sessions where user is the doctor.
     */
    public function doctorCallSessions()
    {
        return $this->hasMany(CallSession::class, 'doctor_id');
    }

    /**
     * Get reviews for this user (as the reviewed person).
     */
    public function reviews()
    {
        return $this->hasMany(Reviews::class, 'user_id');
    }

    /**
     * Get reviews written by this user (as the reviewer).
     */
    public function writtenReviews()
    {
        return $this->hasMany(Reviews::class, 'reviewer_id');
    }

    /**
     * Check if user has text sessions remaining in their subscription.
     */
    public function hasTextSessionsRemaining()
    {
        if (!$this->subscription) {
            return false;
        }
        
        // Check if subscription is active using the accessor logic
        if (!$this->subscription->isActive) {
            return false;
        }
        
        return $this->subscription->text_sessions_remaining > 0;
    }

    /**
     * Get the number of text sessions remaining.
     */
    public function getTextSessionsRemaining()
    {
        if (!$this->subscription || !$this->subscription->isActive) {
            return 0;
        }
        
        return $this->subscription->text_sessions_remaining;
    }

    /**
     * Check if user is available for instant sessions (doctors only).
     */
    public function isAvailableForInstantSessions()
    {
        if (!$this->isDoctor()) {
            return false;
        }
        
        return $this->is_online_for_instant_sessions && $this->is_active;
    }

    /**
     * Get user's active text session.
     */
    public function getActiveTextSession()
    {
        return $this->textSessions()
            ->where('status', 'active')
            ->first();
    }

    /**
     * Get the profile picture URL attribute.
     */
    public function getProfilePictureUrlAttribute()
    {
        if ($this->profile_picture) {
            // Reuse normalization from HasImageUrls
            return $this->buildImageUrl($this->profile_picture);
        }
        return null;
    }

    /**
     * Toggle online status for instant sessions (doctors only).
     */
    public function toggleOnlineStatus()
    {
        if (!$this->isDoctor()) {
            return false;
        }

        $this->is_online_for_instant_sessions = !$this->is_online_for_instant_sessions;
        $this->last_online_at = $this->is_online_for_instant_sessions ? now() : null;
        $this->save();

        return $this->is_online_for_instant_sessions;
    }

    // Encryption methods
    public function isEncryptionEnabled(): bool
    {
        return $this->encryption_enabled;
    }

    public function enableEncryption(string $publicKey, string $privateKey): void
    {
        $this->update([
            'public_key' => $publicKey,
            'private_key' => $privateKey,
            'encryption_enabled' => true,
        ]);
    }

    public function getPublicKey(): ?string
    {
        return $this->public_key;
    }

    public function getPrivateKey(): ?string
    {
        return $this->private_key;
    }

    public function hasEncryptionKeys(): bool
    {
        return !empty($this->public_key) && !empty($this->private_key);
    }
}