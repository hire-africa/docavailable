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
        Schema::create('call_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('doctor_id')->constrained('users')->onDelete('cascade');
            $table->enum('call_type', ['voice', 'video']);
            $table->string('appointment_id')->index(); // Can be appointment ID or direct session ID
            $table->enum('status', ['active', 'ended', 'expired', 'waiting_for_doctor', 'connecting'])->default('connecting');
            $table->timestamp('started_at');
            $table->timestamp('ended_at')->nullable();
            $table->timestamp('last_activity_at');
            $table->text('reason')->nullable();
            $table->integer('sessions_used')->default(1); // Number of 10-minute sessions used
            $table->integer('sessions_remaining_before_start'); // Sessions remaining when session started
            $table->boolean('is_connected')->default(false);
            $table->integer('call_duration')->default(0); // Duration in seconds
            $table->timestamps();
            
            $table->index(['patient_id', 'status']);
            $table->index(['doctor_id', 'status']);
            $table->index(['call_type', 'status']);
            $table->index('last_activity_at');
            $table->index('appointment_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('call_sessions');
    }
};
