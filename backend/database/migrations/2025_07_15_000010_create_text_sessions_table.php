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
        if (!Schema::hasTable('text_sessions')) {
            Schema::create('text_sessions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('patient_id')->constrained('users')->onDelete('cascade');
                $table->foreignId('doctor_id')->constrained('users')->onDelete('cascade');
                $table->enum('status', ['active', 'ended', 'expired', 'waiting_for_doctor'])->default('active');
                $table->timestamp('started_at');
                $table->timestamp('ended_at')->nullable();
                $table->timestamp('last_activity_at');
                $table->integer('sessions_used')->default(1); // Number of 10-minute sessions used
                $table->integer('sessions_remaining_before_start'); // Sessions remaining when session started
                $table->timestamps();
                
                $table->index(['patient_id', 'status']);
                $table->index(['doctor_id', 'status']);
                $table->index('last_activity_at');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('text_sessions');
    }
}; 