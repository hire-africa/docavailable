<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('chat_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('chat_room_id')->constrained('chat_rooms')->onDelete('cascade');
            $table->foreignId('sender_id')->constrained('users')->onDelete('cascade');
            $table->enum('type', ['text', 'image', 'file', 'audio', 'video', 'system', 'typing', 'read_receipt'])->default('text');
            $table->text('content'); // Message content or file path
            $table->string('file_name')->nullable(); // Original file name
            $table->string('file_size')->nullable(); // File size in bytes
            $table->string('file_type')->nullable(); // MIME type
            $table->string('file_url')->nullable(); // File storage URL
            $table->json('metadata')->nullable(); // Additional data (duration for audio/video, dimensions for images, etc.)
            $table->foreignId('reply_to_id')->nullable()->constrained('chat_messages')->onDelete('cascade'); // For reply messages
            $table->boolean('is_edited')->default(false);
            $table->timestamp('edited_at')->nullable();
            $table->boolean('is_deleted')->default(false);
            $table->timestamp('deleted_at')->nullable();
            $table->timestamps();
            
            // Indexes for better performance
            $table->index(['chat_room_id', 'created_at']);
            $table->index(['sender_id', 'created_at']);
            $table->index(['type', 'created_at']);
            $table->index('reply_to_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chat_messages');
    }
};
