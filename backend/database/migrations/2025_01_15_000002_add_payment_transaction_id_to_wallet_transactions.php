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
        Schema::table('wallet_transactions', function (Blueprint $table) {
            $table->string('payment_transaction_id')->nullable()->after('metadata');
            $table->string('payment_gateway')->nullable()->after('payment_transaction_id');
            $table->string('payment_status')->default('completed')->after('payment_gateway');
            
            // Index for better performance
            $table->index('payment_transaction_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('wallet_transactions', function (Blueprint $table) {
            $table->dropIndex(['payment_transaction_id']);
            $table->dropColumn(['payment_transaction_id', 'payment_gateway', 'payment_status']);
        });
    }
}; 