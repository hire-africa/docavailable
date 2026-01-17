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
        Schema::table('appointments', function (Blueprint $table) {
            if (!Schema::hasColumn('appointments', 'call_unlocked_at')) {
                $table->timestamp('call_unlocked_at')->nullable()->after('appointment_datetime_utc');
            }
        });

        try {
            Schema::table('appointments', function (Blueprint $table) {
                $table->index('call_unlocked_at', 'appointments_call_unlocked_at_index');
            });
        } catch (\Throwable $e) {
            // Ignore if index already exists
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            try {
                $table->dropIndex('appointments_call_unlocked_at_index');
            } catch (\Throwable $e) {
                // Ignore if index doesn't exist
            }

            if (Schema::hasColumn('appointments', 'call_unlocked_at')) {
                $table->dropColumn('call_unlocked_at');
            }
        });
    }
};
