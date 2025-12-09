<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $connection = config('database.default');
        $driver = config("database.connections.$connection.driver");

        if ($driver === 'pgsql') {
            // Drop the foreign key constraint
            DB::statement('ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_id_foreign');
            
            // Make plan_id nullable (if not already)
            DB::statement('ALTER TABLE subscriptions ALTER COLUMN plan_id DROP NOT NULL');
            
            // Re-add foreign key constraint allowing NULL
            DB::statement('ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_id_foreign FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE');
        } else {
            Schema::table('subscriptions', function (Blueprint $table) {
                // Drop foreign key if it exists
                try {
                    $table->dropForeign(['plan_id']);
                } catch (\Throwable $e) {
                    // Ignore if constraint doesn't exist
                }
                
                // Make nullable and re-add foreign key
                $table->unsignedBigInteger('plan_id')->nullable()->change();
                $table->foreign('plan_id')->references('id')->on('plans')->onDelete('cascade');
            });
        }
    }

    public function down(): void
    {
        $connection = config('database.default');
        $driver = config("database.connections.$connection.driver");

        if ($driver === 'pgsql') {
            // Drop the nullable foreign key
            DB::statement('ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_id_foreign');
            
            // Make NOT NULL and re-add constraint
            DB::statement('ALTER TABLE subscriptions ALTER COLUMN plan_id SET NOT NULL');
            DB::statement('ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_id_foreign FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE');
        } else {
            Schema::table('subscriptions', function (Blueprint $table) {
                try {
                    $table->dropForeign(['plan_id']);
                    $table->unsignedBigInteger('plan_id')->nullable(false)->change();
                    $table->foreign('plan_id')->references('id')->on('plans')->onDelete('cascade');
                } catch (\Throwable $e) {
                    // Best-effort rollback
                }
            });
        }
    }
};
