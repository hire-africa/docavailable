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
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'is_online_for_instant_sessions')) {
                $table->boolean('is_online_for_instant_sessions')->default(false);
            }
            if (!Schema::hasColumn('users', 'last_online_at')) {
                $table->timestamp('last_online_at')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['is_online_for_instant_sessions', 'last_online_at']);
        });
    }
}; 