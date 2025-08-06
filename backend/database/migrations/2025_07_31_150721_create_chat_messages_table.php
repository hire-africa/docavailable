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
            $table->string('message_id')->unique(); // UUID from frontend
            $table->unsignedBigInteger('appointment_id');
            $table->unsignedBigInteger('sender_id');
            $table->string('sender_name');
            $table->text('message');
            $table->enum('message_type', ['text', 'image', 'voice'])->default('text');
            $table->string('media_url')->nullable();
            $table->string('temp_id')->nullable(); // For temporary messages
            $table->enum('delivery_status', ['sending', 'sent', 'delivered', 'read'])->default('sending');
            $table->json('reactions')->nullable();
            $table->json('read_by')->nullable();
            $table->string('reply_to_id')->nullable();
            $table->text('reply_to_message')->nullable();
            $table->string('reply_to_sender_name')->nullable();
            $table->boolean('is_edited')->default(false);
            $table->timestamp('edited_at')->nullable();
            $table->timestamps();
            
            // Indexes for performance
            $table->index(['appointment_id', 'created_at']);
            $table->index(['sender_id']);
            $table->index(['message_id']);
            $table->index(['temp_id']);
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
