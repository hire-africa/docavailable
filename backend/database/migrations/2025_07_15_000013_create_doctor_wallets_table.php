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
        Schema::create('doctor_wallets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('doctor_id')->constrained('users')->onDelete('cascade');
            $table->decimal('balance', 10, 2)->default(0.00); // Current balance in MWK
            $table->decimal('total_earned', 10, 2)->default(0.00); // Total earnings in MWK
            $table->decimal('total_withdrawn', 10, 2)->default(0.00); // Total withdrawn in MWK
            $table->timestamps();
            
            // Ensure one wallet per doctor
            $table->unique('doctor_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('doctor_wallets');
    }
}; 