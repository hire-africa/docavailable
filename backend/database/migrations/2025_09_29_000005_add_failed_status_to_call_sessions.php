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
            // Add failure_reason column for tracking why calls failed
            $table->string('failure_reason')->nullable()->after('status');
            
            // Add auto_deductions_processed column for tracking processed deductions
            $table->integer('auto_deductions_processed')->default(0)->after('sessions_used');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('call_sessions', function (Blueprint $table) {
            $table->dropColumn(['failure_reason', 'auto_deductions_processed']);
        });
    }
};
