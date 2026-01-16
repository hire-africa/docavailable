<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Adds a nullable session_id column to appointments table for future linkage
     * to authoritative session records (text_sessions or call_sessions).
     * 
     * Design decisions:
     * - Nullable: Ensures all existing appointments remain valid
     * - No default: Avoids unintended coupling or "fake session links"
     * - No FK constraint: Allows phased rollout while finalizing session table structure
     * - Non-unique index: Enables fast lookups without constraining future use cases
     * - No backfill: Leaves existing rows unchanged (unused until later phases)
     */
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            // Add nullable session_id column only if it doesn't exist
            if (!Schema::hasColumn('appointments', 'session_id')) {
                // Add nullable session_id column
                // Type: unsignedBigInteger to match future canonical session identifier
                // Assumes unified numeric ID space (or best-effort pointer until unified table exists)
                $table->unsignedBigInteger('session_id')->nullable()->after('id');
            }
        });
        
        // Add index separately (check if it exists first)
        try {
            Schema::table('appointments', function (Blueprint $table) {
                // Add non-unique index for efficient lookups
                // Non-unique allows for potential future cases (follow-ups, reschedules, merged sessions)
                $table->index('session_id', 'appointments_session_id_index');
            });
        } catch (\Throwable $e) {
            // Index likely already exists; safely ignore
        }
    }

    /**
     * Reverse the migrations.
     * 
     * Safe rollback: drops column and index only if no production code depends on it yet.
     * This matches the "unused by current flows" design.
     */
    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            // Drop index first (required before dropping column in some databases)
            // Only drop if it exists
            try {
                $table->dropIndex(['session_id']);
            } catch (\Throwable $e) {
                // Index may not exist; safely ignore
            }
            
            // Drop column only if it exists
            if (Schema::hasColumn('appointments', 'session_id')) {
                $table->dropColumn('session_id');
            }
        });
    }
};
