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
            $table->json('notification_preferences')->nullable()->after('push_token');
            $table->boolean('email_notifications_enabled')->default(true)->after('notification_preferences');
            $table->boolean('push_notifications_enabled')->default(true)->after('email_notifications_enabled');
            $table->boolean('sms_notifications_enabled')->default(false)->after('push_notifications_enabled');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'notification_preferences',
                'email_notifications_enabled',
                'push_notifications_enabled',
                'sms_notifications_enabled'
            ]);
        });
    }
};
