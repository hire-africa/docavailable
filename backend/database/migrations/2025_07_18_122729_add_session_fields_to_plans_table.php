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
            $table->integer('text_sessions')->default(0)->after('duration');
            $table->integer('voice_calls')->default(0)->after('text_sessions');
            $table->integer('video_calls')->default(0)->after('voice_calls');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn(['text_sessions', 'voice_calls', 'video_calls']);
        });
    }
};
