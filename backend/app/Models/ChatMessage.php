<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChatMessage extends Model
{
    use HasFactory;

    protected $fillable = [
        'chat_room_id',
        'sender_id',
        'message',
        'type',
        'attachment_url',
        'is_read',
        'metadata',
    ];

    protected $casts = [
        'is_read' => 'boolean',
        'metadata' => 'array',
    ];

    /**
     * Get the sender of the message.
     */
    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    /**
     * Get the chat room that the message belongs to.
     */
    public function chatRoom(): BelongsTo
    {
        return $this->belongsTo(ChatRoom::class); // Assuming ChatRoom model exists or will be created/linked
        // Note: Logic in TextSessionController suggests TextSession might actually specificy the connection
        // But strictly, let's just ensure the model exists for now.
    }

    /**
     * Get the read receipts for the message.
     */
    public function reads(): HasMany
    {
        return $this->hasMany(ChatMessageRead::class, 'message_id');
    }
}
