<?php

require_once __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

echo "🔧 Fixing Cascade Delete Issue...\n\n";

try {
    // 1. Drop the existing foreign key constraint
    echo "1. Dropping existing foreign key constraint...\n";
    DB::statement('ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_id_foreign');
    echo "✅ Foreign key constraint dropped\n";
    
    // 2. Re-add the constraint with SET NULL instead of CASCADE
    echo "2. Adding new foreign key constraint with SET NULL...\n";
    DB::statement('ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_id_foreign FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE SET NULL');
    echo "✅ New foreign key constraint added with SET NULL\n";
    
    // 3. Verify the change
    echo "3. Verifying the change...\n";
    $constraints = DB::select("
        SELECT 
            tc.constraint_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name,
            rc.delete_rule
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        JOIN information_schema.referential_constraints AS rc
            ON tc.constraint_name = rc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'subscriptions'
        AND kcu.column_name = 'plan_id'
    ");
    
    foreach ($constraints as $constraint) {
        echo "  - {$constraint->constraint_name}: {$constraint->column_name} -> {$constraint->foreign_table_name}.{$constraint->foreign_column_name} (DELETE: {$constraint->delete_rule})\n";
    }
    
    echo "\n✅ Cascade delete issue fixed!\n";
    echo "Now when a plan is deleted, subscriptions will have plan_id set to NULL instead of being deleted.\n";
    
} catch (Exception $e) {
    echo "❌ Error fixing cascade delete: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
}

