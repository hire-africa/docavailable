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
            // Add remaining session columns
            $table->integer('text_sessions_remaining')->default(0)->after('status');
            $table->integer('voice_calls_remaining')->default(0)->after('text_sessions_remaining');
            $table->integer('video_calls_remaining')->default(0)->after('voice_calls_remaining');
            
            // Add total session columns
            $table->integer('total_text_sessions')->default(0)->after('video_calls_remaining');
            $table->integer('total_voice_calls')->default(0)->after('total_text_sessions');
            $table->integer('total_video_calls')->default(0)->after('total_voice_calls');
            
            // Add other missing columns
            $table->string('plan_name')->nullable()->after('plan_id');
            $table->integer('plan_price')->default(0)->after('plan_name');
            $table->string('plan_currency', 3)->default('USD')->after('plan_price');
            $table->timestamp('activated_at')->nullable()->after('is_active');
            $table->timestamp('expires_at')->nullable()->after('activated_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropColumn([
                'text_sessions_remaining',
                'voice_calls_remaining',
                'video_calls_remaining',
                'total_text_sessions',
                'total_voice_calls',
                'total_video_calls',
                'plan_name',
                'plan_price',
                'plan_currency',
                'activated_at',
                'expires_at'
            ]);
        });
    }
};
