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
            // Add only the missing columns
            if (!Schema::hasColumn('subscriptions', 'total_text_sessions')) {
                $table->integer('total_text_sessions')->default(0)->after('text_sessions_remaining');
            }
            if (!Schema::hasColumn('subscriptions', 'activated_at')) {
                $table->timestamp('activated_at')->nullable()->after('status');
            }
            if (!Schema::hasColumn('subscriptions', 'expires_at')) {
                $table->timestamp('expires_at')->nullable()->after('activated_at');
            }
            if (!Schema::hasColumn('subscriptions', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('expires_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropColumn([
                'total_text_sessions',
                'activated_at',
                'expires_at',
                'is_active'
            ]);
        });
    }
};
