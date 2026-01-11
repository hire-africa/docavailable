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
        // Add columns individually to ensure one existing column doesn't block the rest
        if (!Schema::hasColumn('text_sessions', 'scheduled_at')) {
            Schema::table('text_sessions', function (Blueprint $table) {
                $table->timestamp('scheduled_at')->nullable()->after('ended_at');
            });
        }

        if (!Schema::hasColumn('text_sessions', 'appointment_id')) {
            Schema::table('text_sessions', function (Blueprint $table) {
                $table->unsignedBigInteger('appointment_id')->nullable()->after('scheduled_at');
            });
        }

        if (!Schema::hasColumn('text_sessions', 'session_type')) {
            Schema::table('text_sessions', function (Blueprint $table) {
                $table->string('session_type', 20)->default('text')->after('appointment_id');
            });
        }

        if (!Schema::hasColumn('text_sessions', 'text_enabled')) {
            Schema::table('text_sessions', function (Blueprint $table) {
                $table->boolean('text_enabled')->default(true)->after('session_type');
            });
        }

        if (!Schema::hasColumn('text_sessions', 'call_enabled')) {
            Schema::table('text_sessions', function (Blueprint $table) {
                $table->boolean('call_enabled')->default(false)->after('text_enabled');
            });
        }
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
