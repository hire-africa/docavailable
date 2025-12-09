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
        Schema::create('payment_transactions', function (Blueprint $table) {
            $table->id();
            $table->string('transaction_id')->unique();
            $table->string('reference');
            $table->decimal('amount', 10, 2);
            $table->string('currency', 3)->default('MWK');
            $table->enum('status', ['pending', 'completed', 'failed'])->default('pending');
            $table->string('phone_number')->nullable();
            $table->string('payment_method')->default('mobile_money');
            $table->string('gateway')->default('paychangu');
            $table->json('webhook_data')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();

            $table->index(['transaction_id']);
            $table->index(['reference']);
            $table->index(['status']);
            $table->index(['gateway']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_transactions');
    }
}; 