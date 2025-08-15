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
        Schema::table('text_sessions', function (Blueprint $table) {
            $table->text('reason')->nullable()->after('sessions_remaining_before_start');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('text_sessions', function (Blueprint $table) {
            $table->dropColumn('reason');
        });
    }
};
