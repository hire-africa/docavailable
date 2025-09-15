<?php

require 'vendor/autoload.php';

$app = require 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

echo "🔍 Testing Production Database Connection\n";
echo "========================================\n\n";

try {
    // Test database connection
    $pdo = DB::connection()->getPdo();
    echo "✅ Database connection successful\n";
    echo "Database: " . DB::connection()->getDatabaseName() . "\n\n";
    
    // Check if payment_transactions table exists
    $tables = DB::select("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_transactions'");
    
    if (empty($tables)) {
        echo "❌ Payment transactions table does not exist\n";
    } else {
        echo "✅ Payment transactions table exists\n";
        
        // Check columns
        $columns = DB::select('SELECT column_name FROM information_schema.columns WHERE table_name = ?', ['payment_transactions']);
        echo "Columns: " . implode(', ', array_column($columns, 'column_name')) . "\n";
        
        // Check if gateway_reference column exists
        $hasGatewayRef = false;
        foreach($columns as $col) {
            if ($col->column_name === 'gateway_reference') {
                $hasGatewayRef = true;
                break;
            }
        }
        
        if ($hasGatewayRef) {
            echo "✅ gateway_reference column exists\n";
        } else {
            echo "❌ gateway_reference column missing\n";
        }
    }
    
    // Check if plans table has data
    $plansCount = DB::table('plans')->count();
    echo "Plans in database: " . $plansCount . "\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}

echo "\n🔍 Test complete.\n";
