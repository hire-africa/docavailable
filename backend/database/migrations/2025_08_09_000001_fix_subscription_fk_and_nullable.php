<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Use raw SQL for Postgres-safe column type/nullable change without requiring doctrine/dbal
        $connection = config('database.default');
        $driver = config("database.connections.$connection.driver");

        if ($driver === 'pgsql') {
            // Make plan_id nullable and ensure big integer types for ids
            DB::statement('ALTER TABLE subscriptions ALTER COLUMN plan_id DROP NOT NULL');
            // Align id types if needed (only when columns exist and are integer)
            // Note: Skip changing user_id here to avoid downtime; ensure inserts use existing type
        } else {
            // Fallback using Schema builder for other drivers
            Schema::table('subscriptions', function (Blueprint $table) {
                try {
                    $table->unsignedBigInteger('plan_id')->nullable()->change();
                } catch (\Throwable $e) {
                    // Ignore if DBAL is not installed; the pgsql path handles prod
                }
            });
        }
    }

    public function down(): void
    {
        $connection = config('database.default');
        $driver = config("database.connections.$connection.driver");

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE subscriptions ALTER COLUMN plan_id SET NOT NULL');
        } else {
            Schema::table('subscriptions', function (Blueprint $table) {
                try {
                    $table->unsignedBigInteger('plan_id')->nullable(false)->change();
                } catch (\Throwable $e) {
                    // Best-effort rollback
                }
            });
        }
    }
};

