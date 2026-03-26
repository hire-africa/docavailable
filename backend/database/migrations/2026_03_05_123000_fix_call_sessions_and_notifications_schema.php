<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Fix notifications.data column type
        // PostgreSQL requires jsonb for efficient querying and to use the -> operator
        // This fixes the "operator does not exist: text ->> unknown" error in PostgreSQL
        if (config('database.default') === 'pgsql') {
            DB::statement('ALTER TABLE notifications ALTER COLUMN data TYPE jsonb USING data::jsonb');
        } else {
            Schema::table('notifications', function (Blueprint $table) {
                $table->json('data')->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert notifications.data
        if (config('database.default') === 'pgsql') {
            DB::statement('ALTER TABLE notifications ALTER COLUMN data TYPE text USING data::text');
        } else {
            Schema::table('notifications', function (Blueprint $table) {
                $table->text('data')->change();
            });
        }
    }
};
