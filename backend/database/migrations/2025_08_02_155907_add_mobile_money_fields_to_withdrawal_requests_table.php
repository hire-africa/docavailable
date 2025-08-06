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
        Schema::table('withdrawal_requests', function (Blueprint $table) {
            // Add payment method field
            $table->string('payment_method')->default('bank_transfer')->after('amount');
            
            // Add mobile money fields
            $table->string('mobile_provider')->nullable()->after('account_holder_name');
            $table->string('mobile_number')->nullable()->after('mobile_provider');
            
            // Add bank branch field for Malawi users
            $table->string('bank_branch')->nullable()->after('bank_name');
            
            // Rename bank_account to account_number for consistency
            $table->renameColumn('bank_account', 'account_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('withdrawal_requests', function (Blueprint $table) {
            $table->dropColumn(['payment_method', 'mobile_provider', 'mobile_number', 'bank_branch']);
            $table->renameColumn('account_number', 'bank_account');
        });
    }
};
