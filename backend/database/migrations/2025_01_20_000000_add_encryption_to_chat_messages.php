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
        Schema::table('chat_messages', function (Blueprint $table) {
            // Add encryption-related fields only if they don't exist
            if (!Schema::hasColumn('chat_messages', 'encrypted_content')) {
                $table->text('encrypted_content')->nullable()->after('content');
            }
            if (!Schema::hasColumn('chat_messages', 'iv')) {
                $table->string('iv', 64)->nullable()->after('encrypted_content');
            }
            if (!Schema::hasColumn('chat_messages', 'tag')) {
                $table->string('tag', 64)->nullable()->after('iv');
            }
            if (!Schema::hasColumn('chat_messages', 'algorithm')) {
                $table->string('algorithm', 32)->nullable()->after('tag');
            }
            if (!Schema::hasColumn('chat_messages', 'is_encrypted')) {
                $table->boolean('is_encrypted')->default(false)->after('algorithm');
            }
            
            // Add index for encrypted messages if it doesn't exist
            if (!Schema::hasIndex('chat_messages', 'chat_messages_is_encrypted_index')) {
                $table->index('is_encrypted');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('chat_messages', function (Blueprint $table) {
            $table->dropIndex(['is_encrypted']);
            $table->dropColumn([
                'encrypted_content',
                'iv',
                'tag',
                'algorithm',
                'is_encrypted'
            ]);
        });
    }
}; 