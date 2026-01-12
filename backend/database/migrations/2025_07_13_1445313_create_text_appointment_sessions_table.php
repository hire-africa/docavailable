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
        try {
            if (!Schema::hasTable('text_appointment_sessions')) {
                Schema::create('text_appointment_sessions', function (Blueprint $table) {
                    $table->id();
                    $table->unsignedBigInteger('appointment_id');
                    $table->unsignedBigInteger('patient_id');
                    $table->unsignedBigInteger('doctor_id');
                    $table->boolean('is_active')->default(false);
                    $table->timestamp('start_time')->nullable();
                    $table->timestamp('last_activity_time')->nullable();
                    $table->boolean('has_patient_activity')->default(false);
                    $table->boolean('has_doctor_activity')->default(false);
                    $table->integer('sessions_used')->default(0);
                    $table->boolean('is_ended')->default(false);
                    $table->timestamp('ended_at')->nullable();
                    $table->timestamps();

                    // Foreign key constraints
                    try {
                        $table->foreign('appointment_id')->references('id')->on('appointments')->onDelete('cascade');
                        $table->foreign('patient_id')->references('id')->on('users')->onDelete('cascade');
                        $table->foreign('doctor_id')->references('id')->on('users')->onDelete('cascade');
                    } catch (\Throwable $e) {
                    }

                    // Indexes for better performance
                    try {
                        $table->index(['appointment_id', 'is_active']);
                        $table->index(['patient_id', 'is_active']);
                        $table->index(['doctor_id', 'is_active']);
                        $table->index('last_activity_time');
                    } catch (\Throwable $e) {
                    }
                });
            }
        } catch (\Throwable $e) {
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('text_appointment_sessions');
    }
};
