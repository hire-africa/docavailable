<?php

// Test payment initiation with specific price to check for conflicts
echo "Testing payment initiation with specific price...\n";

// From your transaction logs, the amount was 97.00 MWK
$testAmount = 97.00;
$testCurrency = 'MWK';

echo "Testing with amount: $testAmount $testCurrency\n";
echo "This matches the amount from your successful transaction logs.\n\n";

// Let's also test with different amounts to see if there's a price conflict
$testAmounts = [97.00, 100.00, 95.00, 99.00];

foreach ($testAmounts as $amount) {
    echo "Testing amount: $amount $testCurrency\n";
    
    // Simulate what the payment initiation would do
    $plan = [
        'id' => 1,
        'name' => 'Test Plan',
        'price' => $amount,
        'currency' => $testCurrency,
        'duration' => 30,
        'text_sessions' => 5,
        'voice_calls' => 2,
        'video_calls' => 1,
    ];
    
    echo "Plan data:\n";
    print_r($plan);
    echo "\n";
    
    // Check if this matches the webhook amount
    $webhookAmount = 97.00; // From your transaction logs
    
    if ($amount == $webhookAmount) {
        echo "✅ Amount matches webhook amount ($webhookAmount)\n";
    } else {
        echo "⚠️  Amount mismatch: Plan price ($amount) vs Webhook amount ($webhookAmount)\n";
        echo "   This could cause transaction creation to fail!\n";
    }
    
    echo "---\n";
}

echo "\nConclusion:\n";
echo "If the plan price in the database doesn't match the amount in the webhook (97.00 MWK),\n";
echo "the transaction creation during payment initiation might fail.\n";
echo "\nThe webhook amount was: 97.00 MWK\n";
echo "Make sure plan_id=1 has price=97.00 and currency=MWK\n"; 