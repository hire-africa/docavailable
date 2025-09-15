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
            // Add encryption key fields
            $table->text('encryption_key')->nullable()->after('last_message_at');
            $table->boolean('encryption_enabled')->default(false)->after('encryption_key');
            
            // Add index for encrypted rooms
            $table->index('encryption_enabled');
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