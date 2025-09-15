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
        $hasPaymentTxId = Schema::hasColumn('wallet_transactions', 'payment_transaction_id');
        $hasPaymentGateway = Schema::hasColumn('wallet_transactions', 'payment_gateway');
        $hasPaymentStatus = Schema::hasColumn('wallet_transactions', 'payment_status');

        if (!($hasPaymentTxId && $hasPaymentGateway && $hasPaymentStatus)) {
            Schema::table('wallet_transactions', function (Blueprint $table) use ($hasPaymentTxId, $hasPaymentGateway, $hasPaymentStatus) {
                if (!$hasPaymentTxId) {
                    $table->string('payment_transaction_id')->nullable()->after('metadata');
                }
                if (!$hasPaymentGateway) {
                    $table->string('payment_gateway')->nullable()->after('payment_transaction_id');
                }
                if (!$hasPaymentStatus) {
                    $table->string('payment_status')->default('completed')->after('payment_gateway');
                }
            });
        }

        if (Schema::hasColumn('wallet_transactions', 'payment_transaction_id')) {
            try {
                Schema::table('wallet_transactions', function (Blueprint $table) {
                    $table->index('payment_transaction_id');
                });
            } catch (\Throwable $e) {
                // index likely exists; ignore
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('wallet_transactions', 'payment_transaction_id')) {
            try {
                Schema::table('wallet_transactions', function (Blueprint $table) {
                    $table->dropIndex(['payment_transaction_id']);
                });
            } catch (\Throwable $e) {
                // ignore
            }
        }

        Schema::table('wallet_transactions', function (Blueprint $table) {
            $columnsToDrop = [];
            foreach (['payment_transaction_id', 'payment_gateway', 'payment_status'] as $column) {
                if (Schema::hasColumn('wallet_transactions', $column)) {
                    $columnsToDrop[] = $column;
                }
            }
            if (!empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
}; 