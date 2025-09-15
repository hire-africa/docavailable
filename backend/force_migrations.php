<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

echo "🚀 Force Running All Migrations...\n";
echo "================================\n\n";

// Test database connection first
echo "1️⃣ Testing database connection...\n";
try {
    $pdo = DB::connection()->getPdo();
    echo "   ✅ Database connection successful\n";
    echo "   📊 Database: " . DB::connection()->getDatabaseName() . "\n\n";
} catch (Exception $e) {
    echo "   ❌ Database connection failed: " . $e->getMessage() . "\n\n";
    exit(1);
}

// Ensure migrations table exists
echo "2️⃣ Ensuring migrations table exists...\n";
try {
    $sql = "CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        migration VARCHAR(255) NOT NULL,
        batch INTEGER NOT NULL
    )";
    
    DB::statement($sql);
    echo "   ✅ Migrations table ready\n\n";
} catch (Exception $e) {
    echo "   ❌ Failed to create migrations table: " . $e->getMessage() . "\n\n";
    exit(1);
}

// Get all migration files
echo "3️⃣ Scanning migration files...\n";
$migrationPath = database_path('migrations');
$migrationFiles = glob($migrationPath . '/*.php');
$migrationFiles = array_filter($migrationFiles, function($file) {
    return basename($file) !== '.gitkeep';
});

echo "   📁 Found " . count($migrationFiles) . " migration files\n\n";

// Check which migrations have already been run
echo "4️⃣ Checking existing migrations...\n";
try {
    $existingMigrations = DB::table('migrations')->pluck('migration')->toArray();
    echo "   📊 Already run: " . count($existingMigrations) . " migrations\n";
    
    $pendingMigrations = [];
    foreach ($migrationFiles as $file) {
        $migrationName = basename($file, '.php');
        if (!in_array($migrationName, $existingMigrations)) {
            $pendingMigrations[] = $file;
        }
    }
    
    echo "   ⏳ Pending: " . count($pendingMigrations) . " migrations\n\n";
    
} catch (Exception $e) {
    echo "   ❌ Failed to check existing migrations: " . $e->getMessage() . "\n\n";
    exit(1);
}

if (empty($pendingMigrations)) {
    echo "✅ All migrations are already up to date!\n";
    exit(0);
}

// Run migrations manually
echo "5️⃣ Running pending migrations...\n";
$batch = DB::table('migrations')->max('batch') + 1;
$successCount = 0;
$errorCount = 0;

foreach ($pendingMigrations as $file) {
    $migrationName = basename($file, '.php');
    echo "   🔄 Running: $migrationName\n";
    
    try {
        // Include the migration file
        require_once $file;
        
        // Get the migration class
        $migrationClass = require $file;
        
        // Run the migration
        $migrationClass->up();
        
        // Record the migration
        DB::table('migrations')->insert([
            'migration' => $migrationName,
            'batch' => $batch
        ]);
        
        echo "   ✅ Success: $migrationName\n";
        $successCount++;
        
    } catch (Exception $e) {
        echo "   ❌ Failed: $migrationName - " . $e->getMessage() . "\n";
        $errorCount++;
        
        // Continue with other migrations
        continue;
    }
}

echo "\n📊 Migration Summary:\n";
echo "   ✅ Successful: $successCount\n";
echo "   ❌ Failed: $errorCount\n";
echo "   📁 Total: " . count($pendingMigrations) . "\n\n";

if ($errorCount > 0) {
    echo "⚠️ Some migrations failed. Check the errors above.\n";
    exit(1);
} else {
    echo "🎉 All migrations completed successfully!\n";
}

// Verify the results
echo "6️⃣ Verifying migration results...\n";
try {
    $finalCount = DB::table('migrations')->count();
    echo "   📊 Total migrations recorded: $finalCount\n";
    
    // Check if key tables exist
    $keyTables = ['users', 'password_reset_tokens', 'sessions', 'appointments', 'plans', 'subscriptions'];
    foreach ($keyTables as $table) {
        if (Schema::hasTable($table)) {
            echo "   ✅ Table exists: $table\n";
        } else {
            echo "   ❌ Table missing: $table\n";
        }
    }
    
} catch (Exception $e) {
    echo "   ❌ Verification failed: " . $e->getMessage() . "\n";
}

echo "\n🚀 Force migration completed!\n";
echo "💡 The database should now have all required tables and columns.\n";
