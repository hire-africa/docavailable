<?php

require_once __DIR__ . '/vendor/autoload.php';

use App\Models\User;
use App\Models\Subscription;
use App\Models\Plan;

echo "🔍 Diagnosing Subscription Disappearing Issue...\n\n";

// 1. Check if Laravel is properly loaded
try {
    $app = require_once __DIR__ . '/bootstrap/app.php';
    $app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
    echo "✅ Laravel loaded successfully\n";
} catch (Exception $e) {
    echo "❌ Failed to load Laravel: " . $e->getMessage() . "\n";
    exit(1);
}

// 2. Check database connection
try {
    DB::connection()->getPdo();
    echo "✅ Database connection successful\n";
} catch (Exception $e) {
    echo "❌ Database connection failed: " . $e->getMessage() . "\n";
    exit(1);
}

// 3. Check subscription table structure
echo "\n📋 Checking subscription table structure...\n";
try {
    $columns = DB::select("SELECT column_name, data_type, is_nullable, column_default 
                          FROM information_schema.columns 
                          WHERE table_name = 'subscriptions' 
                          ORDER BY ordinal_position");
    
    echo "Subscription table columns:\n";
    foreach ($columns as $column) {
        echo "  - {$column->column_name}: {$column->data_type} " . 
             ($column->is_nullable === 'YES' ? 'NULL' : 'NOT NULL') . 
             ($column->column_default ? " DEFAULT {$column->column_default}" : "") . "\n";
    }
} catch (Exception $e) {
    echo "❌ Failed to check table structure: " . $e->getMessage() . "\n";
}

// 4. Check for existing subscriptions
echo "\n👥 Checking existing subscriptions...\n";
try {
    $subscriptionCount = Subscription::count();
    echo "Total subscriptions in database: {$subscriptionCount}\n";
    
    $activeSubscriptions = Subscription::where('is_active', true)->count();
    echo "Active subscriptions: {$activeSubscriptions}\n";
    
    $inactiveSubscriptions = Subscription::where('is_active', false)->count();
    echo "Inactive subscriptions: {$inactiveSubscriptions}\n";
    
    // Check subscriptions by status
    $statusCounts = Subscription::selectRaw('status, COUNT(*) as count')
        ->groupBy('status')
        ->get();
    
    echo "Subscriptions by status:\n";
    foreach ($statusCounts as $status) {
        echo "  - Status {$status->status}: {$status->count}\n";
    }
    
} catch (Exception $e) {
    echo "❌ Failed to check subscriptions: " . $e->getMessage() . "\n";
}

// 5. Check specific user subscriptions
echo "\n👤 Checking user subscriptions...\n";
try {
    $usersWithSubscriptions = User::whereHas('subscription')->count();
    echo "Users with subscriptions: {$usersWithSubscriptions}\n";
    
    $usersWithoutSubscriptions = User::whereDoesntHave('subscription')->count();
    echo "Users without subscriptions: {$usersWithoutSubscriptions}\n";
    
    // Check a few specific users
    $testUsers = User::take(5)->get();
    foreach ($testUsers as $user) {
        $subscription = $user->subscription;
        echo "User {$user->id} ({$user->email}): " . 
             ($subscription ? "Has subscription (ID: {$subscription->id}, Active: " . ($subscription->is_active ? 'Yes' : 'No') . ")" : "No subscription") . "\n";
    }
    
} catch (Exception $e) {
    echo "❌ Failed to check user subscriptions: " . $e->getMessage() . "\n";
}

// 6. Check subscription relationship loading
echo "\n🔗 Testing subscription relationship loading...\n";
try {
    $user = User::first();
    if ($user) {
        echo "Testing with user ID: {$user->id}\n";
        
        // Test direct subscription query
        $directSubscription = Subscription::where('user_id', $user->id)->first();
        echo "Direct query subscription: " . ($directSubscription ? "Found (ID: {$directSubscription->id})" : "Not found") . "\n";
        
        // Test relationship loading
        $userWithSubscription = User::with('subscription')->find($user->id);
        $relationshipSubscription = $userWithSubscription->subscription;
        echo "Relationship subscription: " . ($relationshipSubscription ? "Found (ID: {$relationshipSubscription->id})" : "Not found") . "\n";
        
        // Test lazy loading
        $lazySubscription = $user->subscription;
        echo "Lazy loaded subscription: " . ($lazySubscription ? "Found (ID: {$lazySubscription->id})" : "Not found") . "\n";
    }
} catch (Exception $e) {
    echo "❌ Failed to test relationship loading: " . $e->getMessage() . "\n";
}

// 7. Check for any subscription records with issues
echo "\n⚠️ Checking for problematic subscription records...\n";
try {
    // Check subscriptions with null user_id
    $nullUserSubscriptions = Subscription::whereNull('user_id')->count();
    echo "Subscriptions with null user_id: {$nullUserSubscriptions}\n";
    
    // Check subscriptions with null plan_id
    $nullPlanSubscriptions = Subscription::whereNull('plan_id')->count();
    echo "Subscriptions with null plan_id: {$nullPlanSubscriptions}\n";
    
    // Check subscriptions with expired dates
    $expiredSubscriptions = Subscription::where('end_date', '<', now())->count();
    echo "Expired subscriptions: {$expiredSubscriptions}\n";
    
    // Check subscriptions with future start dates
    $futureStartSubscriptions = Subscription::where('start_date', '>', now())->count();
    echo "Subscriptions with future start dates: {$futureStartSubscriptions}\n";
    
} catch (Exception $e) {
    echo "❌ Failed to check problematic records: " . $e->getMessage() . "\n";
}

// 8. Test subscription API endpoint
echo "\n🌐 Testing subscription API endpoint...\n";
try {
    // Create a test user if none exists
    $testUser = User::first();
    if (!$testUser) {
        echo "No users found, creating test user...\n";
        $testUser = User::create([
            'email' => 'test@example.com',
            'password' => bcrypt('password'),
            'first_name' => 'Test',
            'last_name' => 'User',
            'user_type' => 'patient'
        ]);
    }
    
    // Create a test subscription if none exists
    $testSubscription = $testUser->subscription;
    if (!$testSubscription) {
        echo "No subscription found for test user, creating one...\n";
        $testSubscription = Subscription::create([
            'user_id' => $testUser->id,
            'plan_id' => 1, // Assuming plan 1 exists
            'plan_name' => 'Test Plan',
            'plan_price' => 100,
            'plan_currency' => 'USD',
            'text_sessions_remaining' => 10,
            'voice_calls_remaining' => 2,
            'video_calls_remaining' => 1,
            'total_text_sessions' => 10,
            'total_voice_calls' => 2,
            'total_video_calls' => 1,
            'start_date' => now(),
            'end_date' => now()->addDays(30),
            'status' => 1,
            'is_active' => true,
            'activated_at' => now()
        ]);
    }
    
    echo "Test user ID: {$testUser->id}\n";
    echo "Test subscription ID: {$testSubscription->id}\n";
    echo "Test subscription active: " . ($testSubscription->is_active ? 'Yes' : 'No') . "\n";
    
} catch (Exception $e) {
    echo "❌ Failed to test API endpoint: " . $e->getMessage() . "\n";
}

echo "\n✅ Diagnosis complete!\n";
echo "\nPossible causes of disappearing subscriptions:\n";
echo "1. Database migration issues (missing columns or constraints)\n";
echo "2. Subscription records being marked as inactive\n";
echo "3. Subscription expiration dates in the past\n";
echo "4. Foreign key constraint violations\n";
echo "5. Relationship loading issues\n";
echo "6. API endpoint returning null data\n";
echo "7. Frontend not properly handling null subscription responses\n";

