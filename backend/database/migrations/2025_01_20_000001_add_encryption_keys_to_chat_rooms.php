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
        Schema::table('chat_rooms', function (Blueprint $table) {
            // Add encryption key fields only if they don't exist
            if (!Schema::hasColumn('chat_rooms', 'encryption_key')) {
                $table->text('encryption_key')->nullable()->after('last_message_at');
            }
            if (!Schema::hasColumn('chat_rooms', 'encryption_enabled')) {
                $table->boolean('encryption_enabled')->default(false)->after('encryption_key');
            }
            
            // Add index for encrypted rooms if it doesn't exist
            if (!Schema::hasIndex('chat_rooms', 'chat_rooms_encryption_enabled_index')) {
                $table->index('encryption_enabled');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('chat_rooms', function (Blueprint $table) {
            $table->dropIndex(['encryption_enabled']);
            $table->dropColumn([
                'encryption_key',
                'encryption_enabled'
            ]);
        });
    }
}; 