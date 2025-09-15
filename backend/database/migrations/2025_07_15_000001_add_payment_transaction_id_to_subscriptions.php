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
        // Make migration idempotent: only add columns/index if they do not already exist
        $hasPaymentTxId = Schema::hasColumn('subscriptions', 'payment_transaction_id');
        $hasPaymentGateway = Schema::hasColumn('subscriptions', 'payment_gateway');
        $hasPaymentStatus = Schema::hasColumn('subscriptions', 'payment_status');
        $hasPaymentMetadata = Schema::hasColumn('subscriptions', 'payment_metadata');

        if (!($hasPaymentTxId && $hasPaymentGateway && $hasPaymentStatus && $hasPaymentMetadata)) {
            Schema::table('subscriptions', function (Blueprint $table) use ($hasPaymentTxId, $hasPaymentGateway, $hasPaymentStatus, $hasPaymentMetadata) {
                if (!$hasPaymentTxId) {
                    $table->string('payment_transaction_id')->nullable()->after('status');
                }
                if (!$hasPaymentGateway) {
                    $table->string('payment_gateway')->nullable()->after('payment_transaction_id');
                }
                if (!$hasPaymentStatus) {
                    $table->string('payment_status')->default('pending')->after('payment_gateway');
                }
                if (!$hasPaymentMetadata) {
                    $table->json('payment_metadata')->nullable()->after('payment_status');
                }
            });
        }

        // Ensure index exists for payment_transaction_id (ignore if it already exists)
        if (Schema::hasColumn('subscriptions', 'payment_transaction_id')) {
            try {
                Schema::table('subscriptions', function (Blueprint $table) {
                    $table->index('payment_transaction_id');
                });
            } catch (\Throwable $e) {
                // Likely index already exists; safely ignore
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop index and columns only if they exist
        if (Schema::hasColumn('subscriptions', 'payment_transaction_id')) {
            try {
                Schema::table('subscriptions', function (Blueprint $table) {
                    $table->dropIndex(['payment_transaction_id']);
                });
            } catch (\Throwable $e) {
                // Index may not exist; ignore
            }
        }

        Schema::table('subscriptions', function (Blueprint $table) {
            $columnsToDrop = [];
            foreach (['payment_transaction_id', 'payment_gateway', 'payment_status', 'payment_metadata'] as $column) {
                if (Schema::hasColumn('subscriptions', $column)) {
                    $columnsToDrop[] = $column;
                }
            }
            if (!empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
}; 