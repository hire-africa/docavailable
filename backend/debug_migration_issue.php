<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;

echo "🔍 Debugging Migration Issue...\n";
echo "==============================\n\n";

// Test 1: Check environment variables
echo "1️⃣ Checking environment variables...\n";
echo "   DB_CONNECTION: " . env('DB_CONNECTION', 'NOT SET') . "\n";
echo "   DB_HOST: " . env('DB_HOST', 'NOT SET') . "\n";
echo "   DB_DATABASE: " . env('DB_DATABASE', 'NOT SET') . "\n";
echo "   DB_USERNAME: " . env('DB_USERNAME', 'NOT SET') . "\n";
echo "   DB_PASSWORD: " . (env('DB_PASSWORD') ? 'SET' : 'NOT SET') . "\n";
echo "   DB_URL: " . (env('DB_URL') ? 'SET' : 'NOT SET') . "\n\n";

// Test 2: Check database configuration
echo "2️⃣ Checking database configuration...\n";
$defaultConnection = config('database.default');
echo "   Default connection: $defaultConnection\n";

$connections = config('database.connections');
echo "   Available connections: " . implode(', ', array_keys($connections)) . "\n";

if (isset($connections[$defaultConnection])) {
    $config = $connections[$defaultConnection];
    echo "   Current connection config keys: " . implode(', ', array_keys($config)) . "\n";
    
    // Check if driver is set
    if (isset($config['driver'])) {
        echo "   ✅ Driver is set: " . $config['driver'] . "\n";
    } else {
        echo "   ❌ Driver is missing!\n";
    }
    
    // Check other important keys
    $importantKeys = ['host', 'database', 'username', 'password'];
    foreach ($importantKeys as $key) {
        if (isset($config[$key])) {
            echo "   ✅ $key is set: " . ($key === 'password' ? 'HIDDEN' : $config[$key]) . "\n";
        } else {
            echo "   ❌ $key is missing!\n";
        }
    }
} else {
    echo "   ❌ Default connection '$defaultConnection' not found in config!\n";
}
echo "\n";

// Test 3: Try to get database connection manually
echo "3️⃣ Testing database connection manually...\n";
try {
    $pdo = DB::connection()->getPdo();
    echo "   ✅ Database connection successful\n";
    echo "   📊 Database: " . DB::connection()->getDatabaseName() . "\n";
    echo "   🔗 Driver: " . DB::connection()->getDriverName() . "\n";
} catch (Exception $e) {
    echo "   ❌ Database connection failed: " . $e->getMessage() . "\n";
    echo "   📍 Error location: " . $e->getFile() . ":" . $e->getLine() . "\n";
}
echo "\n";

// Test 4: Check if migrations table exists
echo "4️⃣ Checking migrations table...\n";
try {
    $migrationsExist = DB::getSchemaBuilder()->hasTable('migrations');
    if ($migrationsExist) {
        echo "   ✅ Migrations table exists\n";
        $migrationCount = DB::table('migrations')->count();
        echo "   📊 Migrations run: $migrationCount\n";
    } else {
        echo "   ❌ Migrations table does not exist\n";
    }
} catch (Exception $e) {
    echo "   ❌ Error checking migrations table: " . $e->getMessage() . "\n";
}
echo "\n";

// Test 5: Try to run a simple migration manually
echo "5️⃣ Testing manual migration...\n";
try {
    // Try to create migrations table manually
    $sql = "CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        migration VARCHAR(255) NOT NULL,
        batch INTEGER NOT NULL
    )";
    
    DB::statement($sql);
    echo "   ✅ Migrations table created/verified\n";
    
    // Check if we can insert into migrations table
    $testMigration = 'test_migration_' . time();
    DB::table('migrations')->insert([
        'migration' => $testMigration,
        'batch' => 1
    ]);
    echo "   ✅ Can insert into migrations table\n";
    
    // Clean up test migration
    DB::table('migrations')->where('migration', $testMigration)->delete();
    echo "   ✅ Can delete from migrations table\n";
    
} catch (Exception $e) {
    echo "   ❌ Manual migration test failed: " . $e->getMessage() . "\n";
}
echo "\n";

// Test 6: Check Laravel version and compatibility
echo "6️⃣ Checking Laravel version...\n";
echo "   Laravel version: " . app()->version() . "\n";
echo "   PHP version: " . PHP_VERSION . "\n";
echo "   Database driver: " . (extension_loaded('pdo_pgsql') ? '✅ pdo_pgsql loaded' : '❌ pdo_pgsql not loaded') . "\n\n";

echo "🔍 Migration issue debug completed!\n";
echo "💡 Check the output above to identify the configuration problem.\n";
