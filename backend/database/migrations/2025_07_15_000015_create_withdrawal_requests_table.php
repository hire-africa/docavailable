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
        Schema::create('withdrawal_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('doctor_id')->constrained('users')->onDelete('cascade');
            $table->decimal('amount', 10, 2); // Amount requested in MWK
            $table->string('status')->default('pending'); // 'pending', 'approved', 'rejected', 'paid'
            $table->string('bank_account')->nullable();
            $table->string('bank_name')->nullable();
            $table->string('account_holder_name')->nullable();
            $table->text('rejection_reason')->nullable(); // Reason if rejected
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null'); // Admin who approved
            $table->foreignId('paid_by')->nullable()->constrained('users')->onDelete('set null'); // Admin who marked as paid
            $table->json('payment_details')->nullable(); // Additional payment information
            $table->timestamps();
            
            // Indexes for better performance
            $table->index(['doctor_id', 'status']);
            $table->index(['status', 'created_at']);
            $table->index('approved_by');
            $table->index('paid_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('withdrawal_requests');
    }
};