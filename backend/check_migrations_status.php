<?php

echo "🔍 Checking migration status...\n\n";

// Create test transaction to get DB access
$testData = [
    'transaction_id' => 'MIGRATION_CHECK_' . time(),
    'reference' => 'MIGRATION_CHECK_' . time(),
    'amount' => 1.00,
    'currency' => 'MWK',
    'status' => 'pending',
    'meta' => ['check' => 'migrations']
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://docavailable-1.onrender.com/api/payments/test-webhook');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($testData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);

$response = curl_exec($ch);
$error = curl_error($ch);
curl_close($ch);

if ($error) {
    echo "Error: $error\n";
    exit(1);
}

$data = json_decode($response, true);
if (isset($data['error']) && strpos($data['error'], 'SQLSTATE') !== false) {
    echo "Database Error Details:\n";
    print_r($data);
    
    // Parse error message for constraint info
    $error = $data['error'];
    if (preg_match('/constraint "([^"]+)"/', $error, $matches)) {
        echo "\nFailing Constraint: " . $matches[1] . "\n";
    }
    
    echo "\nPossible Issues:\n";
    echo "1. Migration 2025_08_09_000002_fix_subscription_foreign_key.php hasn't run\n";
    echo "2. Foreign key constraint still exists and blocks NULL values\n";
    echo "3. Another constraint is failing (check error message)\n";
    
    echo "\nTo Fix:\n";
    echo "1. SSH into server and run: php artisan migrate --force\n";
    echo "2. Or set up Render post-deploy: composer install && php artisan migrate --force\n";
    echo "3. Or manually fix constraint:\n";
    echo "   ALTER TABLE subscriptions DROP CONSTRAINT subscriptions_plan_id_foreign;\n";
    echo "   ALTER TABLE subscriptions ALTER COLUMN plan_id DROP NOT NULL;\n";
    echo "   ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_id_foreign\n";
    echo "   FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE;\n";
} else {
    echo "Got response:\n";
    print_r($data);
}
