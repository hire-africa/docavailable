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
            $table->index(['doctor_id', 'status', 'appointment_date']);
            $table->index(['patient_id', 'status', 'appointment_date']);
        });

        Schema::table('text_sessions', function (Blueprint $table) {
            $table->index(['doctor_id', 'status']);
            $table->index(['patient_id', 'status']);
        });

        Schema::table('notifications', function (Blueprint $table) {
            $table->index(['notifiable_id', 'notifiable_type', 'read_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropIndex(['doctor_id', 'status', 'appointment_date']);
            $table->dropIndex(['patient_id', 'status', 'appointment_date']);
        });

        Schema::table('text_sessions', function (Blueprint $table) {
            $table->dropIndex(['doctor_id', 'status']);
            $table->dropIndex(['patient_id', 'status']);
        });

        Schema::table('notifications', function (Blueprint $table) {
            $table->dropIndex(['notifiable_id', 'notifiable_type', 'read_at']);
        });
    }
};
