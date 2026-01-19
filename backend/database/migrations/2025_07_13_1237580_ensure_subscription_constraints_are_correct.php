<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        $connection = config('database.default');
        $driver = config("database.connections.$connection.driver");

        if ($driver === 'pgsql') {
            // Check if there's a unique constraint on user_id that we need to remove
            $constraints = DB::select("
                SELECT constraint_name, constraint_type 
                FROM information_schema.table_constraints 
                WHERE table_name = 'subscriptions' 
                AND constraint_type = 'UNIQUE'
                AND constraint_name LIKE '%user_id%'
            ");

            foreach ($constraints as $constraint) {
                DB::statement("ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS {$constraint->constraint_name}");
            }

            // Ensure user_id is not unique (users can have multiple subscriptions)
            // This is already handled by the foreign key constraint

        } elseif ($driver !== 'sqlite') {
            // For other databases except SQLite (which doesn't support dropping indices this way)
            Schema::table('subscriptions', function (Blueprint $table) {
                try {
                    $table->dropUnique(['user_id']);
                } catch (\Throwable $e) {
                    // Ignore if constraint doesn't exist
                }
            });
        }
    }

    public function down(): void
    {
        // We don't want to add back unique constraints on user_id
        // as users should be able to have multiple subscriptions
    }
};
