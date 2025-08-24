<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

echo "📋 Checking Existing Plans...\n";
echo "============================\n\n";

try {
    $plans = DB::table('plans')->get();
    echo "📊 Found " . count($plans) . " plans:\n\n";
    
    foreach ($plans as $plan) {
        echo "Plan ID: {$plan->id}\n";
        echo "Name: {$plan->name}\n";
        echo "Description: {$plan->description}\n";
        echo "Price: \${$plan->price} {$plan->currency}\n";
        echo "Duration: {$plan->duration_days} days\n";
        echo "Active: " . ($plan->is_active ? 'Yes' : 'No') . "\n";
        echo "Features: " . $plan->features . "\n";
        echo "---\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
} 