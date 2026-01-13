<?php

// Check which database the app is actually using
echo "🔍 Checking Database Connection...\n\n";

// Load Laravel environment
require_once __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Config;

try {
    echo "1. Current Database Configuration:\n";
    echo "   Connection: " . Config::get('database.default') . "\n";
    echo "   Host: " . Config::get('database.connections.' . Config::get('database.default') . '.host') . "\n";
    echo "   Database: " . Config::get('database.connections.' . Config::get('database.default') . '.database') . "\n";
    echo "   Username: " . Config::get('database.connections.' . Config::get('database.default') . '.username') . "\n";
    echo "   SSL Mode: " . Config::get('database.connections.' . Config::get('database.default') . '.sslmode') . "\n";

    echo "\n2. Testing Database Connection...\n";
    $pdo = DB::connection()->getPdo();
    echo "✅ Database connection successful!\n";

    echo "\n3. Checking Subscriptions Table Structure...\n";
    $columns = DB::select("
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'subscriptions' 
        ORDER BY ordinal_position
    ");

    if (empty($columns)) {
        echo "❌ Subscriptions table not found!\n";
    } else {
        echo "✅ Subscriptions table found with " . count($columns) . " columns:\n";
        foreach ($columns as $column) {
            echo "   - {$column->column_name} ({$column->data_type}) " .
                ($column->is_nullable === 'YES' ? 'NULL' : 'NOT NULL') . "\n";
        }
    }

    echo "\n4. Checking for Unique Constraints on user_id...\n";
    $constraints = DB::select("
        SELECT constraint_name, constraint_type 
        FROM information_schema.table_constraints 
        WHERE table_name = 'subscriptions' 
        AND constraint_type = 'UNIQUE'
        AND constraint_name LIKE '%user_id%'
    ");

    if (empty($constraints)) {
        echo "✅ No unique constraints on user_id found\n";
    } else {
        echo "⚠️  Found unique constraints that might cause issues:\n";
        foreach ($constraints as $constraint) {
            echo "   - {$constraint->constraint_name}\n";
        }
    }

    echo "\n5. Checking Existing Subscriptions...\n";
    $subscriptionCount = DB::table('subscriptions')->count();
    echo "   Total subscriptions: $subscriptionCount\n";

    $activeSubscriptions = DB::table('subscriptions')->where('is_active', true)->count();
    echo "   Active subscriptions: $activeSubscriptions\n";

    echo "\n6. Checking Plans Table...\n";
    $planCount = DB::table('plans')->count();
    echo "   Total plans: $planCount\n";

    if ($planCount > 0) {
        $plans = DB::table('plans')->select('id', 'name', 'price', 'status')->get();
        foreach ($plans as $plan) {
            echo "   - Plan {$plan->id}: {$plan->name} (\${$plan->price}) - Status: {$plan->status}\n";
        }
    }

    echo "\n7. Checking Users Table...\n";
    $userCount = DB::table('users')->count();
    echo "   Total users: $userCount\n";

    echo "\n" . str_repeat("=", 50) . "\n";
    echo "✅ Database check completed successfully!\n";
    echo "This is the database your app is actually using.\n";

} catch (Exception $e) {
    echo "❌ Database connection failed: " . $e->getMessage() . "\n";
    echo "This explains why subscription creation might be failing.\n";
}
