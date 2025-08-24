<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

echo "🔍 Testing Database Connection and Schema...\n";
echo "==========================================\n\n";

// Test 1: Database connection
echo "1️⃣ Testing database connection...\n";
try {
    $pdo = DB::connection()->getPdo();
    echo "   ✅ Database connection successful\n";
    echo "   📊 Database: " . DB::connection()->getDatabaseName() . "\n";
    echo "   🔗 Driver: " . DB::connection()->getDriverName() . "\n\n";
} catch (Exception $e) {
    echo "   ❌ Database connection failed: " . $e->getMessage() . "\n\n";
    exit(1);
}

// Test 2: Check if users table exists
echo "2️⃣ Checking if users table exists...\n";
try {
    if (Schema::hasTable('users')) {
        echo "   ✅ Users table exists\n\n";
    } else {
        echo "   ❌ Users table does not exist\n\n";
        exit(1);
    }
} catch (Exception $e) {
    echo "   ❌ Error checking users table: " . $e->getMessage() . "\n\n";
    exit(1);
}

// Test 3: Check if display_name column exists
echo "3️⃣ Checking if display_name column exists...\n";
try {
    if (Schema::hasColumn('users', 'display_name')) {
        echo "   ✅ display_name column exists\n\n";
    } else {
        echo "   ❌ display_name column does not exist\n";
        echo "   📋 Available columns in users table:\n";
        
        $columns = DB::select("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position");
        foreach ($columns as $column) {
            echo "      - " . $column->column_name . "\n";
        }
        echo "\n";
    }
} catch (Exception $e) {
    echo "   ❌ Error checking display_name column: " . $e->getMessage() . "\n\n";
}

// Test 4: Check migration status
echo "4️⃣ Checking migration status...\n";
try {
    $migrations = DB::table('migrations')->get();
    echo "   📊 Total migrations run: " . $migrations->count() . "\n";
    
    $recentMigrations = $migrations->take(5);
    echo "   📋 Recent migrations:\n";
    foreach ($recentMigrations as $migration) {
        echo "      - " . $migration->migration . "\n";
    }
    echo "\n";
} catch (Exception $e) {
    echo "   ❌ Error checking migrations: " . $e->getMessage() . "\n\n";
}

echo "🔍 Database test completed!\n";
