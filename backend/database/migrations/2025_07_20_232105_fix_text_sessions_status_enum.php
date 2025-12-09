<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // For SQLite, we need to recreate the table to change the enum
        // First, create a new table with the correct structure
        Schema::create('text_sessions_new', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('doctor_id')->constrained('users')->onDelete('cascade');
            $table->enum('status', ['active', 'ended', 'expired', 'waiting_for_doctor'])->default('active');
            $table->timestamp('started_at');
            $table->timestamp('ended_at')->nullable();
            $table->timestamp('last_activity_at');
            $table->integer('sessions_used')->default(1);
            $table->integer('sessions_remaining_before_start');
            $table->integer('max_duration_minutes')->nullable();
            $table->timestamp('doctor_response_deadline')->nullable();
            $table->timestamp('activated_at')->nullable();
            $table->string('chat_id')->unique()->nullable();
            $table->timestamps();
            
            $table->index(['patient_id', 'status']);
            $table->index(['doctor_id', 'status']);
            $table->index('last_activity_at');
        });

        // Copy existing data, converting any invalid status to 'active'
        DB::statement("
            INSERT INTO text_sessions_new 
            SELECT id, patient_id, doctor_id, 
                   CASE 
                       WHEN status IN ('active', 'ended', 'expired') THEN status 
                       ELSE 'active' 
                   END as status,
                   started_at, ended_at, last_activity_at, sessions_used, 
                   sessions_remaining_before_start, max_duration_minutes, 
                   doctor_response_deadline, activated_at, chat_id, 
                   created_at, updated_at
            FROM text_sessions
        ");

        // Drop the old table and rename the new one
        Schema::dropIfExists('text_sessions');
        Schema::rename('text_sessions_new', 'text_sessions');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Recreate the old table structure
        Schema::create('text_sessions_old', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('doctor_id')->constrained('users')->onDelete('cascade');
            $table->enum('status', ['active', 'ended', 'expired'])->default('active');
            $table->timestamp('started_at');
            $table->timestamp('ended_at')->nullable();
            $table->timestamp('last_activity_at');
            $table->integer('sessions_used')->default(1);
            $table->integer('sessions_remaining_before_start');
            $table->integer('max_duration_minutes')->nullable();
            $table->timestamp('doctor_response_deadline')->nullable();
            $table->timestamp('activated_at')->nullable();
            $table->string('chat_id')->unique()->nullable();
            $table->timestamps();
            
            $table->index(['patient_id', 'status']);
            $table->index(['doctor_id', 'status']);
            $table->index('last_activity_at');
        });

        // Copy data back, converting 'waiting_for_doctor' to 'active'
        DB::statement("
            INSERT INTO text_sessions_old 
            SELECT id, patient_id, doctor_id, 
                   CASE 
                       WHEN status = 'waiting_for_doctor' THEN 'active' 
                       ELSE status 
                   END as status,
                   started_at, ended_at, last_activity_at, sessions_used, 
                   sessions_remaining_before_start, max_duration_minutes, 
                   doctor_response_deadline, activated_at, chat_id, 
                   created_at, updated_at
            FROM text_sessions
        ");

        Schema::dropIfExists('text_sessions');
        Schema::rename('text_sessions_old', 'text_sessions');
    }
};
