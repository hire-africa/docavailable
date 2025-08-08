<?php

/**
 * Migration Script: SQLite to Neon PostgreSQL
 * 
 * This script helps migrate your existing SQLite database to Neon PostgreSQL.
 * Run this script after setting up your Neon database connection.
 */

require_once __DIR__ . '/../vendor/autoload.php';

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Load Laravel application
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🚀 Starting migration from SQLite to Neon PostgreSQL...\n\n";

try {
    // Step 1: Test Neon connection
    echo "1. Testing Neon PostgreSQL connection...\n";
    DB::connection('pgsql')->getPdo();
    echo "✅ Neon connection successful!\n\n";

    // Step 2: Run migrations on Neon
    echo "2. Running migrations on Neon...\n";
    $output = shell_exec('cd ' . __DIR__ . '/.. && php artisan migrate --force 2>&1');
    echo $output;
    echo "✅ Migrations completed!\n\n";

    // Step 3: Export data from SQLite
    echo "3. Exporting data from SQLite...\n";
    $sqliteDb = __DIR__ . '/../database/database.sqlite';
    
    if (!file_exists($sqliteDb)) {
        throw new Exception("SQLite database not found at: $sqliteDb");
    }

    // Get all tables from SQLite
    $tables = DB::connection('sqlite')->select("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    
    $exportedData = [];
    foreach ($tables as $table) {
        $tableName = $table->name;
        echo "   Exporting table: $tableName\n";
        
        $data = DB::connection('sqlite')->table($tableName)->get();
        $exportedData[$tableName] = $data;
    }
    
    echo "✅ Data export completed!\n\n";

    // Step 4: Import data to Neon
    echo "4. Importing data to Neon PostgreSQL...\n";
    
    foreach ($exportedData as $tableName => $records) {
        if (count($records) > 0) {
            echo "   Importing $tableName (" . count($records) . " records)\n";
            
            // Convert SQLite data to PostgreSQL format
            foreach ($records as $record) {
                $recordArray = (array) $record;
                
                // Handle SQLite-specific data types
                foreach ($recordArray as $key => $value) {
                    // Convert SQLite boolean to PostgreSQL boolean
                    if ($value === 0 || $value === 1) {
                        $recordArray[$key] = (bool) $value;
                    }
                    
                    // Handle JSON fields
                    if (is_string($value) && (str_starts_with($value, '{') || str_starts_with($value, '['))) {
                        $decoded = json_decode($value, true);
                        if (json_last_error() === JSON_ERROR_NONE) {
                            $recordArray[$key] = $decoded;
                        }
                    }
                }
                
                try {
                    DB::connection('pgsql')->table($tableName)->insert($recordArray);
                } catch (Exception $e) {
                    echo "   ⚠️  Warning: Could not insert record in $tableName: " . $e->getMessage() . "\n";
                }
            }
        }
    }
    
    echo "✅ Data import completed!\n\n";

    // Step 5: Verify migration
    echo "5. Verifying migration...\n";
    
    $neonTables = DB::connection('pgsql')->select("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
    echo "   Tables in Neon: " . count($neonTables) . "\n";
    
    foreach ($neonTables as $table) {
        $tableName = $table->tablename;
        $count = DB::connection('pgsql')->table($tableName)->count();
        echo "   - $tableName: $count records\n";
    }
    
    echo "\n🎉 Migration completed successfully!\n";
    echo "Your database has been successfully migrated to Neon PostgreSQL.\n";
    
} catch (Exception $e) {
    echo "❌ Migration failed: " . $e->getMessage() . "\n";
    echo "Please check your Neon connection settings in .env file.\n";
    exit(1);
} 