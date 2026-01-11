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
        Schema::table('appointments', function (Blueprint $table) {
            // Add UTC datetime column for proper timezone handling
            if (!Schema::hasColumn('appointments', 'appointment_datetime_utc')) {
                $table->timestamp('appointment_datetime_utc')->nullable()->after('appointment_time');
            }

            // Add user timezone for conversion back to local time
            if (!Schema::hasColumn('appointments', 'user_timezone')) {
                $table->string('user_timezone', 50)->default('UTC')->after('appointment_datetime_utc');
            }

            // Add index for better query performance
            // Note: Index addition might still fail if it exists, but usually Laravel handles it or we can try-catch
            try {
                $table->index(['appointment_datetime_utc', 'status']);
            } catch (\Exception $e) {
            }
        });
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
