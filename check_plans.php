<?php

require_once 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Plan;

echo "Checking available plans...\n";

$plans = Plan::all();

if ($plans->count() > 0) {
    echo "Found " . $plans->count() . " plans:\n";
    foreach ($plans as $plan) {
        echo "  ID: {$plan->id}, Name: {$plan->name}, Price: {$plan->price} {$plan->currency}\n";
    }
} else {
    echo "No plans found in database.\n";
}

