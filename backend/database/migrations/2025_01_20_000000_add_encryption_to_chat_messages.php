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
            // Add encryption-related fields
            $table->text('encrypted_content')->nullable()->after('content');
            $table->string('iv', 64)->nullable()->after('encrypted_content');
            $table->string('tag', 64)->nullable()->after('iv');
            $table->string('algorithm', 32)->nullable()->after('tag');
            $table->boolean('is_encrypted')->default(false)->after('algorithm');
            
            // Add index for encrypted messages
            $table->index('is_encrypted');
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