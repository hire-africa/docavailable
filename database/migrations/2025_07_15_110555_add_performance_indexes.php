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
        // Add indexes to users table
        Schema::table('users', function (Blueprint $table) {
            $table->index('role');
            $table->index('email');
            $table->index(['role', 'is_active']);
        });

        // Add indexes to appointments table
        Schema::table('appointments', function (Blueprint $table) {
            $table->index('patient_id');
            $table->index('doctor_id');
            $table->index('status');
            $table->index('appointment_date');
            $table->index(['doctor_id', 'appointment_date']);
            $table->index(['patient_id', 'appointment_date']);
            $table->index(['status', 'appointment_date']);
        });

        // Add indexes to reviews table
        Schema::table('reviews', function (Blueprint $table) {
            $table->index('user_id');
            $table->index('reviewer_id');
            $table->index('rating');
        });

        // Add indexes to working_hours table
        Schema::table('working_hours', function (Blueprint $table) {
            $table->index('doctor_id');
            $table->index('day');
            $table->index(['doctor_id', 'day']);
        });

        // Add indexes to subscriptions table
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->index('user_id');
            $table->index('plan_id');
            $table->index('status');
            $table->index('end_date');
        });

        // Add indexes to plans table
        Schema::table('plans', function (Blueprint $table) {
            $table->index('status');
            $table->index('price');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove indexes from users table
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['role']);
            $table->dropIndex(['email']);
            $table->dropIndex(['role', 'is_active']);
        });

        // Remove indexes from appointments table
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropIndex(['patient_id']);
            $table->dropIndex(['doctor_id']);
            $table->dropIndex(['status']);
            $table->dropIndex(['appointment_date']);
            $table->dropIndex(['doctor_id', 'appointment_date']);
            $table->dropIndex(['patient_id', 'appointment_date']);
            $table->dropIndex(['status', 'appointment_date']);
        });

        // Remove indexes from reviews table
        Schema::table('reviews', function (Blueprint $table) {
            $table->dropIndex(['user_id']);
            $table->dropIndex(['reviewer_id']);
            $table->dropIndex(['rating']);
        });

        // Remove indexes from working_hours table
        Schema::table('working_hours', function (Blueprint $table) {
            $table->dropIndex(['doctor_id']);
            $table->dropIndex(['day']);
            $table->dropIndex(['doctor_id', 'day']);
        });

        // Remove indexes from subscriptions table
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropIndex(['user_id']);
            $table->dropIndex(['plan_id']);
            $table->dropIndex(['status']);
            $table->dropIndex(['end_date']);
        });

        // Remove indexes from plans table
        Schema::table('plans', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropIndex(['price']);
        });
    }
}; 