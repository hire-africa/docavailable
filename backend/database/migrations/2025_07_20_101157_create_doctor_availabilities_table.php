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
        Schema::create('doctor_availabilities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('doctor_id')->constrained('users')->onDelete('cascade');
            $table->boolean('is_online')->default(false);
            $table->json('working_hours')->nullable();
            $table->integer('max_patients_per_day')->default(10);
            $table->boolean('auto_accept_appointments')->default(false);
            $table->timestamps();
            
            // Ensure one availability record per doctor
            $table->unique('doctor_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('doctor_availabilities');
    }
};
