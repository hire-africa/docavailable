<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use App\Models\Subscription;
use App\Models\Plan;

echo "🧪 Testing Webhook Database Connection...\n\n";

try {
    // Test with standard Laravel database connection
    $connection = DB::connection('pgsql'); // Use standard pgsql connection
    $pdo = $connection->getPdo();
    echo "✅ Database connection successful!\n\n";
    
    // Test subscription creation
    $testData = [
        'user_id' => 11,
        'status' => 1,
        'start_date' => now(),
        'end_date' => now()->addDays(30),
        'payment_metadata' => [
            'transaction_id' => 'TEST_TX_' . time(),
            'reference' => 'TEST_REF_' . time(),
            'amount' => 100,
            'currency' => 'MWK',
            'payment_method' => 'Mobile Money',
            'payment_channel' => 'Airtel Money',
            'paid_at' => now(),
            'customer' => [
                'name' => 'Test User',
                'email' => 'test@example.com',
                'phone' => '+265123456789'
            ]
        ]
    ];
    
    echo "Testing subscription creation...\n";
    $subscription = Subscription::updateOrCreate(
        ['user_id' => 11, 'status' => 1],
        $testData
    );
    
    echo "✅ Subscription created/updated successfully!\n";
    echo "Subscription ID: " . $subscription->id . "\n";
    
} catch (Exception $e) {
    echo "❌ Database test failed!\n";
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
} 