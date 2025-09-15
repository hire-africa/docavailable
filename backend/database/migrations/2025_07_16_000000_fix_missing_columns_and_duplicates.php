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
        // Fix appointments table - add missing columns
        Schema::table('appointments', function (Blueprint $table) {
            // Add missing appointment tracking columns
            if (!Schema::hasColumn('appointments', 'actual_start_time')) {
                $table->timestamp('actual_start_time')->nullable();
            }
            if (!Schema::hasColumn('appointments', 'actual_end_time')) {
                $table->timestamp('actual_end_time')->nullable();
            }
            if (!Schema::hasColumn('appointments', 'completed_at')) {
                $table->timestamp('completed_at')->nullable();
            }
            if (!Schema::hasColumn('appointments', 'patient_joined')) {
                $table->boolean('patient_joined')->default(false);
            }
            if (!Schema::hasColumn('appointments', 'doctor_joined')) {
                $table->boolean('doctor_joined')->default(false);
            }
            if (!Schema::hasColumn('appointments', 'cancelled_reason')) {
                $table->text('cancelled_reason')->nullable();
            }
            if (!Schema::hasColumn('appointments', 'reason')) {
                $table->text('reason')->nullable();
            }
            if (!Schema::hasColumn('appointments', 'sessions_deducted')) {
                $table->integer('sessions_deducted')->default(0);
            }
            if (!Schema::hasColumn('appointments', 'earnings_awarded')) {
                $table->decimal('earnings_awarded', 10, 2)->default(0);
            }
        });

        // Fix text_sessions table - add missing columns
        Schema::table('text_sessions', function (Blueprint $table) {
            if (!Schema::hasColumn('text_sessions', 'auto_deductions_processed')) {
                $table->integer('auto_deductions_processed')->default(0);
            }
            if (!Schema::hasColumn('text_sessions', 'reason')) {
                $table->text('reason')->nullable();
            }
        });

        // Add indexes for better performance
        Schema::table('appointments', function (Blueprint $table) {
            $table->index(['patient_id', 'status']);
            $table->index(['doctor_id', 'status']);
            $table->index(['appointment_date', 'status']);
            $table->index('actual_start_time');
            $table->index('actual_end_time');
        });

        Schema::table('text_sessions', function (Blueprint $table) {
            $table->index(['patient_id', 'status']);
            $table->index(['doctor_id', 'status']);
            $table->index('last_activity_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove indexes
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropIndex(['patient_id', 'status']);
            $table->dropIndex(['doctor_id', 'status']);
            $table->dropIndex(['appointment_date', 'status']);
            $table->dropIndex(['actual_start_time']);
            $table->dropIndex(['actual_end_time']);
        });

        Schema::table('text_sessions', function (Blueprint $table) {
            $table->dropIndex(['patient_id', 'status']);
            $table->dropIndex(['doctor_id', 'status']);
            $table->dropIndex(['last_activity_at']);
        });

        // Remove columns from appointments table
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn([
                'actual_start_time',
                'actual_end_time',
                'completed_at',
                'patient_joined',
                'doctor_joined',
                'cancelled_reason',
                'reason',
                'sessions_deducted',
                'earnings_awarded'
            ]);
        });

        // Remove columns from text_sessions table
        Schema::table('text_sessions', function (Blueprint $table) {
            $table->dropColumn([
                'auto_deductions_processed',
                'reason'
            ]);
        });
    }
};
