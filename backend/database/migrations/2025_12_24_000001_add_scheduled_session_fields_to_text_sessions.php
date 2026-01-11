<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     * 
     * Adds scheduled session support to text_sessions table for unified session management.
     * This enables treating scheduled appointments as "instant sessions with a delayed start".
     */
    public function up(): void
    {
        Schema::table('text_sessions', function (Blueprint $table) {
            // Scheduled session fields
            $table->timestamp('scheduled_at')->nullable()->after('ended_at')
                ->comment('When the scheduled session should activate');

            $table->unsignedBigInteger('appointment_id')->nullable()->after('scheduled_at')
                ->comment('Optional link to appointments table for scheduled sessions');

            // Session type and feature flags
            $table->string('session_type', 20)->default('text')->after('appointment_id')
                ->comment('Type of session: text, audio, or video');

            $table->boolean('text_enabled')->default(true)->after('session_type')
                ->comment('Whether text chat is enabled for this session');

            $table->boolean('call_enabled')->default(false)->after('text_enabled')
                ->comment('Whether call functionality is enabled for this session');

            // Add foreign key constraint
            $table->foreign('appointment_id')
                ->references('id')
                ->on('appointments')
                ->nullOnDelete();

            // Index for scheduler queries (find scheduled sessions ready to activate)
            $table->index(['status', 'scheduled_at'], 'idx_scheduled_sessions');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('text_sessions', function (Blueprint $table) {
            // Drop foreign key first
            $table->dropForeign(['appointment_id']);

            // Drop index
            $table->dropIndex('idx_scheduled_sessions');

            // Drop columns
            $table->dropColumn([
                'scheduled_at',
                'appointment_id',
                'session_type',
                'text_enabled',
                'call_enabled',
            ]);
        });
    }
};
