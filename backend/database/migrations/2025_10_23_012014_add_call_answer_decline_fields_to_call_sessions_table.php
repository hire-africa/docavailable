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
        Schema::table('call_sessions', function (Blueprint $table) {
            $table->timestamp('answered_at')->nullable()->after('last_activity_at');
            $table->unsignedBigInteger('answered_by')->nullable()->after('answered_at');
            $table->timestamp('declined_at')->nullable()->after('answered_by');
            $table->unsignedBigInteger('declined_by')->nullable()->after('declined_at');
            $table->string('decline_reason')->nullable()->after('declined_by');
            
            // Add foreign key constraints
            $table->foreign('answered_by')->references('id')->on('users')->onDelete('set null');
            $table->foreign('declined_by')->references('id')->on('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('call_sessions', function (Blueprint $table) {
            $table->dropForeign(['answered_by']);
            $table->dropForeign(['declined_by']);
            $table->dropColumn([
                'answered_at',
                'answered_by',
                'declined_at',
                'declined_by',
                'decline_reason'
            ]);
        });
    }
};
