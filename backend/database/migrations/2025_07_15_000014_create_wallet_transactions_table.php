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
        Schema::create('wallet_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('doctor_id')->constrained('users')->onDelete('cascade');
            $table->string('type'); // 'credit' (earnings) or 'debit' (withdrawal)
            $table->decimal('amount', 10, 2); // Amount in MWK
            $table->string('description'); // Description of the transaction
            $table->string('session_type')->nullable(); // 'text', 'audio', 'video'
            $table->foreignId('session_id')->nullable(); // Reference to the session that generated this transaction
            $table->string('session_table')->nullable(); // 'text_sessions', 'appointments', etc.
            $table->string('status')->default('completed'); // 'pending', 'completed', 'failed'
            $table->json('metadata')->nullable(); // Additional transaction data
            $table->timestamps();
            
            // Indexes for better performance
            $table->index(['doctor_id', 'type']);
            $table->index(['doctor_id', 'created_at']);
            $table->index('session_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('wallet_transactions');
    }
}; 