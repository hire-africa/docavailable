<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class ChatRoom extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'type',
        'description',
        'avatar',
        'created_by',
        'is_active',
        'last_message_at',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'last_message_at' => 'datetime',
    ];

    // Types
    const TYPE_PRIVATE = 'private';
    const TYPE_GROUP = 'group';
    const TYPE_TEXT_SESSION = 'text_session';

    /**
     * Get the participants in the chat room.
     */
    public function participants(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'chat_room_participants', 'chat_room_id', 'user_id')
            ->withPivot(['role', 'is_muted', 'joined_at', 'last_read_at', 'last_typing_at'])
            ->withTimestamps();
    }

    /**
     * Get the messages in the chat room.
     */
    public function messages(): HasMany
    {
        return $this->hasMany(ChatMessage::class, 'chat_room_id');
    }

    /**
     * Check if a user is a participant in the chat room.
     */
    public function hasParticipant(int $userId): bool
    {
        return $this->participants()->where('user_id', $userId)->exists();
    }

    /**
     * Check if the room is encrypted.
     */
    public function isEncrypted(): bool
    {
        return (bool) ($this->encryption_enabled ?? false);
    }
}
