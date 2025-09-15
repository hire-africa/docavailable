<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            if (!Schema::hasColumn('plans', 'text_sessions')) {
                $table->integer('text_sessions')->default(0)->after('status');
            }
            if (!Schema::hasColumn('plans', 'voice_calls')) {
                $table->integer('voice_calls')->default(0)->after('text_sessions');
            }
            if (!Schema::hasColumn('plans', 'video_calls')) {
                $table->integer('video_calls')->default(0)->after('voice_calls');
            }
        });
    }

    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn(['text_sessions', 'voice_calls', 'video_calls']);
        });
    }
}; 