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
        Schema::table('plans', function (Blueprint $table) {
            // Add indexes for frequently queried columns
            $table->index(['currency', 'status'], 'plans_currency_status_index');
            $table->index(['status'], 'plans_status_index');
            $table->index(['price'], 'plans_price_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropIndex('plans_currency_status_index');
            $table->dropIndex('plans_status_index');
            $table->dropIndex('plans_price_index');
        });
    }
};
