<?php

require_once __DIR__ . '/vendor/autoload.php';

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Bootstrap Laravel
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== Migration Status Check ===\n\n";

try {
    // Check if migrations table exists
    if (Schema::hasTable('migrations')) {
        echo "✅ Migrations table exists\n";
        
        // Check what migrations have been run
        $runMigrations = DB::table('migrations')->get();
        echo "📋 Run migrations count: " . $runMigrations->count() . "\n";
        
        if ($runMigrations->count() > 0) {
            echo "📋 Last few migrations:\n";
            foreach ($runMigrations->take(5) as $migration) {
                echo "   - " . $migration->migration . "\n";
            }
        }
    } else {
        echo "❌ Migrations table does not exist\n";
    }
    
    // Check if users table exists
    if (Schema::hasTable('users')) {
        echo "✅ Users table exists\n";
    } else {
        echo "❌ Users table does not exist\n";
    }
    
    // Check if appointments table exists
    if (Schema::hasTable('appointments')) {
        echo "✅ Appointments table exists\n";
    } else {
        echo "❌ Appointments table does not exist\n";
    }
    
    // Check if subscriptions table exists
    if (Schema::hasTable('subscriptions')) {
        echo "✅ Subscriptions table exists\n";
    } else {
        echo "❌ Subscriptions table does not exist\n";
    }
    
    echo "\n=== Attempting to run migrations ===\n";
    
    // Run migrations
    $exitCode = Artisan::call('migrate', ['--force' => true]);
    
    if ($exitCode === 0) {
        echo "✅ Migrations completed successfully\n";
    } else {
        echo "❌ Migrations failed with exit code: $exitCode\n";
    }
    
    // Check again after migration
    echo "\n=== After Migration Check ===\n";
    
    if (Schema::hasTable('users')) {
        echo "✅ Users table now exists\n";
    } else {
        echo "❌ Users table still does not exist\n";
    }
    
    if (Schema::hasTable('appointments')) {
        echo "✅ Appointments table now exists\n";
    } else {
        echo "❌ Appointments table still does not exist\n";
    }
    
    if (Schema::hasTable('subscriptions')) {
        echo "✅ Subscriptions table now exists\n";
    } else {
        echo "❌ Subscriptions table still does not exist\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
