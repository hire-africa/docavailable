<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add columns individually
        if (!Schema::hasColumn('appointments', 'appointment_datetime_utc')) {
            Schema::table('appointments', function (Blueprint $table) {
                $table->timestamp('appointment_datetime_utc')->nullable()->after('appointment_time');
            });
        }

        if (!Schema::hasColumn('appointments', 'user_timezone')) {
            Schema::table('appointments', function (Blueprint $table) {
                $table->string('user_timezone', 50)->default('UTC')->after('appointment_datetime_utc');
            });
        }

        // Try adding index separately
        try {
            Schema::table('appointments', function (Blueprint $table) {
                $table->index(['appointment_datetime_utc', 'status']);
            });
        } catch (\Throwable $e) {
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropIndex(['appointment_datetime_utc', 'status']);
            $table->dropColumn(['appointment_datetime_utc', 'user_timezone']);
        });
    }
};
