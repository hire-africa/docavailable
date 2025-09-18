<?php

// Check subscription status values in database and code
echo "🔍 Checking Subscription Status Values...\n\n";

// Load Laravel environment
require_once __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

try {
    echo "1. Current subscription statuses in database:\n";
    $statuses = DB::table('subscriptions')->select('status')->distinct()->get();
    if ($statuses->isEmpty()) {
        echo "   No subscriptions found in database\n";
    } else {
        foreach ($statuses as $status) {
            echo "   - Status: {$status->status}\n";
        }
    }
    
    echo "\n2. Checking subscription table structure for status field:\n";
    $columns = DB::select("
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'subscriptions' 
        AND column_name = 'status'
    ");
    
    if (!empty($columns)) {
        $statusColumn = $columns[0];
        echo "   - Column: {$statusColumn->column_name}\n";
        echo "   - Type: {$statusColumn->data_type}\n";
        echo "   - Nullable: {$statusColumn->is_nullable}\n";
        echo "   - Default: " . ($statusColumn->column_default ?? 'NULL') . "\n";
    }
    
    echo "\n3. Checking for status constants in code...\n";
    $files = glob('app/**/*.php');
    $statusReferences = [];
    
    foreach ($files as $file) {
        $content = file_get_contents($file);
        if (strpos($content, 'status') !== false) {
            // Look for status-related patterns
            if (preg_match_all('/(status\s*[=:]\s*[0-9]+|status\s*[=:]\s*[\'"]\w+[\'"]|const\s+\w*STATUS\w*\s*=\s*[0-9]+)/i', $content, $matches)) {
                $statusReferences[basename($file)] = $matches[0];
            }
        }
    }
    
    if (empty($statusReferences)) {
        echo "   No explicit status constants found in code\n";
    } else {
        foreach ($statusReferences as $file => $matches) {
            echo "   - {$file}:\n";
            foreach ($matches as $match) {
                echo "     {$match}\n";
            }
        }
    }
    
    echo "\n4. Checking migration files for status definitions...\n";
    $migrations = glob('database/migrations/*.php');
    $migrationStatusInfo = [];
    
    foreach ($migrations as $migration) {
        $content = file_get_contents($migration);
        if (strpos($content, 'status') !== false) {
            $migrationStatusInfo[] = basename($migration);
        }
    }
    
    if (empty($migrationStatusInfo)) {
        echo "   No status references found in migrations\n";
    } else {
        foreach ($migrationStatusInfo as $migration) {
            echo "   - {$migration}\n";
        }
    }
    
    echo "\n5. Checking existing subscriptions with their statuses:\n";
    $subscriptions = DB::table('subscriptions')
        ->select('id', 'user_id', 'status', 'is_active', 'created_at')
        ->orderBy('created_at', 'desc')
        ->limit(10)
        ->get();
    
    if ($subscriptions->isEmpty()) {
        echo "   No subscriptions found\n";
    } else {
        foreach ($subscriptions as $sub) {
            echo "   - ID: {$sub->id}, User: {$sub->user_id}, Status: {$sub->status}, Active: " . ($sub->is_active ? 'Yes' : 'No') . "\n";
        }
    }
    
    echo "\n6. Common Laravel status patterns:\n";
    echo "   - 0: Inactive/Disabled\n";
    echo "   - 1: Active/Enabled\n";
    echo "   - 2: Pending/Waiting\n";
    echo "   - 3: Suspended/Blocked\n";
    echo "   - 4: Expired/Cancelled\n";
    
    echo "\n" . str_repeat("=", 50) . "\n";
    echo "✅ Status check completed!\n";
    
} catch (Exception $e) {
    echo "❌ Error checking statuses: " . $e->getMessage() . "\n";
}
