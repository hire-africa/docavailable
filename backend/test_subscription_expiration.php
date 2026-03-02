<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Subscription;
use App\Models\User;
use Carbon\Carbon;

// Find or create test user
$user = User::first();
if (!$user) {
    echo "No user found.\n";
    exit;
}

// 1. Create a 30-day subscription that expired 1 day ago (eligible for rollover)
$sub1 = Subscription::create([
    'user_id' => $user->id,
    'plan_id' => 1, // Assume plan 1 exists and is 30 days, or we'll mock duration
    'start_date' => Carbon::now()->subDays(31),
    'end_date' => Carbon::now()->subDays(1),
    'status' => 1,
    'is_active' => true,
]);

echo "Sub1 (Should be inactive at runtime due to end_date): " . ($sub1->is_active ? 'True' : 'False') . "\n";
echo "Sub1 (Raw DB is_active): " . ($sub1->getRawOriginal('is_active') ? 'True' : 'False') . "\n";

// 2. Create a generic subscription that expired 8 days ago (over grace period, should just expire)
$sub2 = Subscription::create([
    'user_id' => $user->id,
    'plan_id' => 1,
    'start_date' => Carbon::now()->subDays(40),
    'end_date' => Carbon::now()->subDays(8),
    'status' => 1,
    'is_active' => true,
]);

echo "Sub2 (Should be inactive): " . ($sub2->is_active ? 'True' : 'False') . "\n";

// Run the service
$service = new App\Services\SubscriptionExpirationService();
$stats = $service->processExpirations();

echo "Expiration Stats:\n";
print_r($stats);

$sub1->refresh();
$sub2->refresh();

echo "Sub1 after process (Rolled over, should be active): " . ($sub1->is_active ? 'True' : 'False') . " End Date: " . $sub1->end_date . "\n";
echo "Sub2 after process (Expired, should be inactive): " . ($sub2->is_active ? 'True' : 'False') . " Status: " . $sub2->status . "\n";

// Cleanup
$sub1->delete();
$sub2->delete();

