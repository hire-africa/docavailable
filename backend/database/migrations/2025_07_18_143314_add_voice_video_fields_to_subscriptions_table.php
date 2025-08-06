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
            $table->integer('voice_calls_remaining')->default(0)->after('text_sessions_remaining');
            $table->integer('video_calls_remaining')->default(0)->after('voice_calls_remaining');
            $table->integer('total_voice_calls')->default(0)->after('appointments_remaining');
            $table->integer('total_video_calls')->default(0)->after('total_voice_calls');
            $table->string('plan_name')->nullable()->after('plan_id');
            $table->integer('plan_price')->default(0)->after('plan_name');
            $table->string('plan_currency', 3)->default('USD')->after('plan_price');
            $table->timestamp('activated_at')->nullable()->after('status');
            $table->timestamp('expires_at')->nullable()->after('activated_at');
            $table->boolean('is_active')->default(true)->after('expires_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropColumn([
                'voice_calls_remaining',
                'video_calls_remaining', 
                'total_voice_calls',
                'total_video_calls',
                'plan_name',
                'plan_price',
                'plan_currency',
                'activated_at',
                'expires_at',
                'is_active'
            ]);
        });
    }
};
