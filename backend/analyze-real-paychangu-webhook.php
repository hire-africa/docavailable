<?php

/**
 * Analyze Real PayChangu Webhook Payload
 * Based on the actual webhook data you received
 */

echo "🔍 ANALYZING REAL PAYCHANGU WEBHOOK\n";
echo "===================================\n\n";

// Real PayChangu webhook payload
$realPaychanguPayload = [
    "event_type" => "checkout.payment",
    "first_name" => "Jsjdjd",
    "last_name" => "djdjd", 
    "email" => "josa@gmail.com",
    "currency" => "MWK",
    "amount" => 100,
    "charge" => 3,
    "amount_split" => [
        "fee_paid_by_customer" => 0,
        "fee_paid_by_merchant" => 3,
        "total_amount_paid_by_customer" => 100,
        "amount_received_by_merchant" => 97
    ],
    "total_amount_paid" => 100,
    "mode" => "live",
    "type" => "API Payment (Checkout)",
    "status" => "success",
    "reference" => "66806395246",
    "tx_ref" => "TXN_1754923308_13",
    "customization" => [
        "title" => "DocAvailable Payment",
        "description" => "Payment for medical consultation services",
        "logo" => null
    ],
    "meta" => "{\"user_id\":13,\"plan_id\":1,\"transaction_id\":98}",
    "customer" => [
        "customer_ref" => "cs_ddb89e13614e8fe",
        "email" => "josa@gmail.com",
        "first_name" => "Jsjdjd",
        "last_name" => "djdjd",
        "phone" => "980794099",
        "created_at" => 1754670159
    ],
    "authorization" => [
        "channel" => "Mobile Money",
        "card_details" => null,
        "bank_payment_details" => null,
        "mobile_money" => [
            "mobile_number" => "+265980xxxx99",
            "operator" => "Airtel Money",
            "trans_id" => null
        ],
        "completed_at" => null
    ],
    "created_at" => "2025-08-11T14:42:43.000000Z",
    "updated_at" => "2025-08-11T14:43:02.000000Z"
];

echo "1. REAL PAYCHANGU WEBHOOK FORMAT:\n";
echo "==================================\n";
echo json_encode($realPaychanguPayload, JSON_PRETTY_PRINT) . "\n\n";

echo "2. WHAT OUR CODE EXPECTS:\n";
echo "=========================\n";

$expectedFormat = [
    "event_type" => "api.charge.payment", // ❌ WRONG!
    "status" => "success", // ✅ CORRECT
    "amount" => 100, // ✅ CORRECT
    "currency" => "MWK", // ✅ CORRECT
    "tx_ref" => "TXN_1754923308_13", // ✅ CORRECT
    "meta" => "{\"user_id\":13,\"plan_id\":1,\"transaction_id\":98}" // ✅ CORRECT
];

echo json_encode($expectedFormat, JSON_PRETTY_PRINT) . "\n\n";

echo "3. COMPARISON ANALYSIS:\n";
echo "=======================\n";

$comparison = [
    "Event Type" => [
        "PayChangu Sends" => "checkout.payment",
        "Our Code Expects" => "api.charge.payment",
        "Match" => "❌ NO",
        "Impact" => "Webhook rejected as 'Event type not supported'"
    ],
    "Status" => [
        "PayChangu Sends" => "success",
        "Our Code Expects" => "success", 
        "Match" => "✅ YES",
        "Impact" => "No issue"
    ],
    "Amount" => [
        "PayChangu Sends" => "100",
        "Our Code Expects" => "100",
        "Match" => "✅ YES", 
        "Impact" => "No issue"
    ],
    "Currency" => [
        "PayChangu Sends" => "MWK",
        "Our Code Expects" => "MWK",
        "Match" => "✅ YES",
        "Impact" => "No issue"
    ],
    "Transaction ID" => [
        "PayChangu Sends" => "tx_ref: TXN_1754923308_13",
        "Our Code Expects" => "tx_ref field",
        "Match" => "✅ YES",
        "Impact" => "No issue"
    ],
    "Meta Data" => [
        "PayChangu Sends" => "{\"user_id\":13,\"plan_id\":1,\"transaction_id\":98}",
        "Our Code Expects" => "JSON string with user_id and plan_id",
        "Match" => "✅ YES",
        "Impact" => "No issue"
    ]
];

foreach ($comparison as $field => $details) {
    echo "{$field}:\n";
    echo "  PayChangu: {$details['PayChangu Sends']}\n";
    echo "  Our Code:  {$details['Our Code Expects']}\n";
    echo "  Match:     {$details['Match']}\n";
    echo "  Impact:    {$details['Impact']}\n\n";
}

echo "4. THE PROBLEM:\n";
echo "===============\n";
echo "❌ Our code only accepts 'api.charge.payment' event type\n";
echo "❌ PayChangu sends 'checkout.payment' event type\n";
echo "❌ This causes the webhook to be rejected\n\n";

echo "5. THE SOLUTION:\n";
echo "================\n";
echo "Update our webhook code to accept 'checkout.payment' event type\n\n";

$fixedCode = '
// Current code (WRONG):
$allowedEventTypes = ["api.charge.payment", "checkout.payment"];

// This should work, but let me check why it\'s not...
';

echo $fixedCode . "\n";

echo "6. DEBUGGING THE ISSUE:\n";
echo "=======================\n";
echo "Let me check what our current code actually does...\n\n";

// Simulate our current webhook processing
$data = $realPaychanguPayload;
$event = strtolower(trim($data['event_type']));
$allowedEventTypes = ['api.charge.payment', 'checkout.payment'];

echo "Event type from PayChangu: '{$data['event_type']}'\n";
echo "Normalized event type: '{$event}'\n";
echo "Allowed event types: " . json_encode($allowedEventTypes) . "\n";
echo "Is event allowed? " . (in_array($event, $allowedEventTypes, true) ? 'YES' : 'NO') . "\n\n";

if (in_array($event, $allowedEventTypes, true)) {
    echo "✅ Event type should be accepted!\n";
    echo "The issue might be elsewhere...\n\n";
} else {
    echo "❌ Event type is being rejected!\n";
    echo "This is the problem!\n\n";
}

echo "7. TESTING THE FIX:\n";
echo "===================\n";

// Test with the real payload
$testData = $realPaychanguPayload;
$eventType = strtolower(trim($testData['event_type']));
$allowedEvents = ['api.charge.payment', 'checkout.payment'];

if (in_array($eventType, $allowedEvents, true)) {
    echo "✅ Event type '{$eventType}' is allowed\n";
    
    $status = $testData['status'];
    if ($status === 'success') {
        echo "✅ Status '{$status}' is success\n";
        
        $meta = json_decode($testData['meta'], true);
        $userId = $meta['user_id'] ?? null;
        $planId = $meta['plan_id'] ?? null;
        
        if ($userId && $planId) {
            echo "✅ User ID: {$userId}, Plan ID: {$planId} found\n";
            echo "✅ This webhook should process successfully!\n";
        } else {
            echo "❌ Missing user_id or plan_id in meta\n";
        }
    } else {
        echo "❌ Status '{$status}' is not success\n";
    }
} else {
    echo "❌ Event type '{$eventType}' is not allowed\n";
}

echo "\n8. RECOMMENDED FIX:\n";
echo "===================\n";
echo "The webhook should work with our current code since 'checkout.payment' is in the allowed list.\n";
echo "The issue might be:\n";
echo "1. Case sensitivity in event type checking\n";
echo "2. Extra whitespace in the event type\n";
echo "3. The event type is being modified somewhere\n";
echo "4. A different part of the code is rejecting it\n\n";

echo "Let me create a test to verify this works...\n";
