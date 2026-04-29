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
        Schema::create('doctor_payment_methods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('doctor_id')->constrained('users')->onDelete('cascade');
            $table->string('type'); // bank_transfer | mobile_money
            $table->string('provider')->nullable(); // airtel_money | mpamba (for mobile money)
            $table->string('label');
            $table->string('holder_name')->nullable();
            $table->json('details');
            $table->boolean('is_primary')->default(false);
            $table->timestamps();

            $table->index(['doctor_id', 'is_primary']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('doctor_payment_methods');
    }
};

