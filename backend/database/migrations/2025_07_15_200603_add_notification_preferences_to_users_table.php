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
        // Check if columns already exist before adding them (skip if duplicates)
        // Note: Schema::hasColumn() must be called outside the Blueprint closure
        if (!Schema::hasColumn('users', 'notification_preferences')) {
            Schema::table('users', function (Blueprint $table) {
                $table->json('notification_preferences')->nullable()->after('push_token');
            });
        }
        
        if (!Schema::hasColumn('users', 'email_notifications_enabled')) {
            Schema::table('users', function (Blueprint $table) {
                $table->boolean('email_notifications_enabled')->default(true)->after('notification_preferences');
            });
        }
        
        if (!Schema::hasColumn('users', 'push_notifications_enabled')) {
            Schema::table('users', function (Blueprint $table) {
                $table->boolean('push_notifications_enabled')->default(true)->after('email_notifications_enabled');
            });
        }
        
        if (!Schema::hasColumn('users', 'sms_notifications_enabled')) {
            Schema::table('users', function (Blueprint $table) {
                $table->boolean('sms_notifications_enabled')->default(false)->after('push_notifications_enabled');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Only drop columns if they exist (safe rollback)
        $columnsToDrop = [];
        
        if (Schema::hasColumn('users', 'notification_preferences')) {
            $columnsToDrop[] = 'notification_preferences';
        }
        if (Schema::hasColumn('users', 'email_notifications_enabled')) {
            $columnsToDrop[] = 'email_notifications_enabled';
        }
        if (Schema::hasColumn('users', 'push_notifications_enabled')) {
            $columnsToDrop[] = 'push_notifications_enabled';
        }
        if (Schema::hasColumn('users', 'sms_notifications_enabled')) {
            $columnsToDrop[] = 'sms_notifications_enabled';
        }
        
        if (!empty($columnsToDrop)) {
            Schema::table('users', function (Blueprint $table) use ($columnsToDrop) {
                $table->dropColumn($columnsToDrop);
            });
        }
    }
};
