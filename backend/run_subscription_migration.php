<?php

// Script to run the subscription constraint migration
echo "🔧 Running Subscription Constraint Migration...\n\n";

// Load Laravel environment
require_once __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

try {
    echo "Checking current database constraints...\n";
    
    $connection = config('database.default');
    $driver = config("database.connections.$connection.driver");
    
    if ($driver === 'pgsql') {
        // Check for unique constraints on user_id in subscriptions table
        $constraints = DB::select("
            SELECT constraint_name, constraint_type 
            FROM information_schema.table_constraints 
            WHERE table_name = 'subscriptions' 
            AND constraint_type = 'UNIQUE'
            AND constraint_name LIKE '%user_id%'
        ");
        
        if (empty($constraints)) {
            echo "✅ No problematic unique constraints found on user_id in subscriptions table\n";
        } else {
            echo "⚠️  Found unique constraints that might cause issues:\n";
            foreach ($constraints as $constraint) {
                echo "   - {$constraint->constraint_name}\n";
            }
        }
        
        // Check foreign key constraints
        $foreignKeys = DB::select("
            SELECT constraint_name, column_name, referenced_table_name, referenced_column_name
            FROM information_schema.key_column_usage 
            WHERE table_name = 'subscriptions' 
            AND referenced_table_name IS NOT NULL
        ");
        
        echo "\nForeign key constraints:\n";
        foreach ($foreignKeys as $fk) {
            echo "   - {$fk->column_name} -> {$fk->referenced_table_name}.{$fk->referenced_column_name}\n";
        }
        
    } else {
        echo "Database driver: $driver\n";
        echo "Migration will be handled by Laravel's migration system\n";
    }
    
    echo "\n✅ Database constraint check completed\n";
    
} catch (Exception $e) {
    echo "❌ Error checking database constraints: " . $e->getMessage() . "\n";
}

echo "\nTo run the migration, execute: php artisan migrate\n";
