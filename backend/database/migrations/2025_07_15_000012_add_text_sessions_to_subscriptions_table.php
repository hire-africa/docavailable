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
            if (!Schema::hasColumn('subscriptions', 'text_sessions_remaining')) {
                $table->integer('text_sessions_remaining')->default(0);
            }
            if (!Schema::hasColumn('subscriptions', 'appointments_remaining')) {
                $table->integer('appointments_remaining')->default(0);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropColumn(['text_sessions_remaining', 'appointments_remaining']);
        });
    }
}; 