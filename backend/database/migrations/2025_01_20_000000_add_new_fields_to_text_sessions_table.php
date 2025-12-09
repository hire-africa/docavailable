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
        Schema::table('text_sessions', function (Blueprint $table) {
            if (!Schema::hasColumn('text_sessions', 'max_duration_minutes')) {
                $table->integer('max_duration_minutes')->nullable()->after('sessions_remaining_before_start');
            }
            if (!Schema::hasColumn('text_sessions', 'doctor_response_deadline')) {
                $table->timestamp('doctor_response_deadline')->nullable()->after('max_duration_minutes');
            }
            if (!Schema::hasColumn('text_sessions', 'activated_at')) {
                $table->timestamp('activated_at')->nullable()->after('doctor_response_deadline');
            }
            if (!Schema::hasColumn('text_sessions', 'chat_id')) {
                $table->string('chat_id')->unique()->nullable()->after('activated_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('text_sessions', function (Blueprint $table) {
            $table->dropColumn([
                'max_duration_minutes',
                'doctor_response_deadline',
                'activated_at',
                'chat_id'
            ]);
        });
    }
}; 