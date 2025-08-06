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
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->string('payment_transaction_id')->nullable()->after('status');
            $table->string('payment_gateway')->nullable()->after('payment_transaction_id');
            $table->string('payment_status')->default('pending')->after('payment_gateway');
            $table->json('payment_metadata')->nullable()->after('payment_status');
            
            // Index for better performance
            $table->index('payment_transaction_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropIndex(['payment_transaction_id']);
            $table->dropColumn(['payment_transaction_id', 'payment_gateway', 'payment_status', 'payment_metadata']);
        });
    }
}; 