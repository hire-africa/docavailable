<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChatRoomParticipant extends Model
{
    use HasFactory;

    protected $fillable = [
        'chat_room_id',
        'user_id',
        'role',
        'is_muted',
        'joined_at',
        'last_read_at',
        'last_typing_at',
    ];

    protected $casts = [
        'is_muted' => 'boolean',
        'joined_at' => 'datetime',
        'last_read_at' => 'datetime',
        'last_typing_at' => 'datetime',
    ];

    // Roles
    const ROLE_ADMIN = 'admin';
    const ROLE_MODERATOR = 'moderator';
    const ROLE_MEMBER = 'member';

    // Relationships
    public function chatRoom(): BelongsTo
    {
        return $this->belongsTo(ChatRoom::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // Helper methods
    public function isAdmin(): bool
    {
        return $this->role === self::ROLE_ADMIN;
    }

    public function isModerator(): bool
    {
        return $this->role === self::ROLE_MODERATOR;
    }

    public function isMember(): bool
    {
        return $this->role === self::ROLE_MEMBER;
    }

    public function canManageRoom(): bool
    {
        return in_array($this->role, [self::ROLE_ADMIN, self::ROLE_MODERATOR]);
    }

    public function updateLastRead(): void
    {
        $this->update(['last_read_at' => now()]);
    }

    public function updateTypingStatus(): void
    {
        $this->update(['last_typing_at' => now()]);
    }

    public function clearTypingStatus(): void
    {
        $this->update(['last_typing_at' => null]);
    }

    public function isTyping(): bool
    {
        return $this->last_typing_at && 
               $this->last_typing_at->diffInSeconds(now()) < 10; // Consider typing for 10 seconds
    }
}
