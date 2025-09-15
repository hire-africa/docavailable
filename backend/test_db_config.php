<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "🔍 Checking Database Configuration...\n\n";

echo "DB_CONNECTION: " . env('DB_CONNECTION') . "\n";
echo "DB_HOST: " . env('DB_HOST') . "\n";
echo "DB_PORT: " . env('DB_PORT') . "\n";
echo "DB_DATABASE: " . env('DB_DATABASE') . "\n";
echo "DB_USERNAME: " . env('DB_USERNAME') . "\n";
echo "DB_URL: " . (env('DB_URL') ? 'SET' : 'NOT SET') . "\n";

echo "\nDatabase connections:\n";
$connections = config('database.connections');
foreach ($connections as $name => $config) {
    echo "- $name: " . ($config['host'] ?? 'N/A') . "\n";
}

echo "\nDefault connection: " . config('database.default') . "\n";
