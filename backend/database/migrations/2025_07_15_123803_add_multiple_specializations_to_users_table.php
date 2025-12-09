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
            // Add sub_specializations column only if it doesn't exist
            // specializations column already exists from previous migration
            if (!Schema::hasColumn('users', 'sub_specializations')) {
                $table->json('sub_specializations')->nullable()->after('sub_specialization');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Only drop sub_specializations since specializations already exists
            $table->dropColumn(['sub_specializations']);
        });
    }
}; 