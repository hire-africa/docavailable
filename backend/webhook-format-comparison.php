<?php

/**
 * Webhook Format Comparison
 * Compare what PayChangu sends vs what we expect
 */

echo "🔍 WEBHOOK FORMAT COMPARISON\n";
echo "============================\n\n";

echo "1. WHAT OUR CODE EXPECTS:\n";
echo "-------------------------\n";

$expectedFormat = [
    'event_type' => 'api.charge.payment', // Required
    'status' => 'success', // Required
    'amount' => 100, // Required
    'currency' => 'MWK', // Required
    'charge_id' => 'charge_123', // Optional
    'tx_ref' => 'tx_ref_123', // Optional (preferred)
    'reference' => 'ref_123', // Optional
    'authorization' => [
        'channel' => 'Mobile Money', // Required
        'completed_at' => '2025-01-01T00:00:00Z', // Required
        'mobile_money' => [
            'operator' => 'Airtel Money',
            'mobile_number' => '+265123456789'
        ]
    ],
    'created_at' => '2025-01-01T00:00:00Z',
    'updated_at' => '2025-01-01T00:00:00Z',
    'meta' => '{"user_id":1,"plan_id":4}' // Required - JSON string
];

echo "Expected webhook format:\n";
echo json_encode($expectedFormat, JSON_PRETTY_PRINT) . "\n\n";

echo "Required fields our code checks:\n";
echo "- event_type (must be 'api.charge.payment' or 'checkout.payment')\n";
echo "- status (must be 'success')\n";
echo "- amount (payment amount)\n";
echo "- currency (payment currency)\n";
echo "- meta (JSON string with user_id and plan_id)\n";
echo "- tx_ref OR charge_id OR reference (for transaction ID)\n\n";

echo "2. WHAT WE'RE SENDING IN TESTS:\n";
echo "-------------------------------\n";

$testFormat = [
    'event_type' => 'api.charge.payment',
    'status' => 'success',
    'amount' => 100,
    'currency' => 'MWK',
    'charge_id' => 'test_' . time(),
    'reference' => 'TEST_' . time(),
    'authorization' => [
        'channel' => 'Mobile Money',
        'completed_at' => date('c')
    ],
    'created_at' => date('c'),
    'updated_at' => date('c'),
    'meta' => json_encode([
        'user_id' => 1,
        'plan_id' => 4
    ])
];

echo "Test webhook format:\n";
echo json_encode($testFormat, JSON_PRETTY_PRINT) . "\n\n";

echo "3. POTENTIAL PAYCHANGU ACTUAL FORMAT:\n";
echo "-------------------------------------\n";

$possiblePaychanguFormat = [
    'event' => 'charge.success', // Different event type
    'data' => [
        'id' => 'charge_123',
        'amount' => 10000, // Amount in cents
        'currency' => 'MWK',
        'status' => 'successful', // Different status value
        'tx_ref' => 'tx_ref_123',
        'customer' => [
            'email' => 'user@example.com',
            'phone' => '+265123456789'
        ],
        'authorization' => [
            'authorization_code' => 'AUTH_123',
            'channel' => 'mobile_money',
            'bank' => 'airtel_money'
        ],
        'created_at' => '2025-01-01T00:00:00Z',
        'updated_at' => '2025-01-01T00:00:00Z'
    ],
    'meta' => [
        'user_id' => 1,
        'plan_id' => 4
    ]
];

echo "Possible PayChangu format (based on common patterns):\n";
echo json_encode($possiblePaychanguFormat, JSON_PRETTY_PRINT) . "\n\n";

echo "4. POTENTIAL MISMATCHES:\n";
echo "------------------------\n";

$mismatches = [
    'Event Type' => [
        'Expected' => 'api.charge.payment',
        'Possible' => 'charge.success',
        'Impact' => 'Webhook will be rejected as unsupported event type'
    ],
    'Status Field' => [
        'Expected' => 'success',
        'Possible' => 'successful',
        'Impact' => 'Payment will not be processed'
    ],
    'Amount Format' => [
        'Expected' => '100 (in main currency)',
        'Possible' => '10000 (in cents)',
        'Impact' => 'Wrong amount processed'
    ],
    'Meta Format' => [
        'Expected' => 'JSON string in meta field',
        'Possible' => 'Object in meta field',
        'Impact' => 'user_id and plan_id not found'
    ],
    'Transaction ID' => [
        'Expected' => 'tx_ref field',
        'Possible' => 'data.id field',
        'Impact' => 'Transaction verification fails'
    ]
];

foreach ($mismatches as $field => $details) {
    echo "❌ {$field}:\n";
    echo "   Expected: {$details['Expected']}\n";
    echo "   Possible: {$details['Possible']}\n";
    echo "   Impact: {$details['Impact']}\n\n";
}

echo "5. RECOMMENDATIONS:\n";
echo "-------------------\n";

echo "1. Add logging to capture actual PayChangu webhook format\n";
echo "2. Make webhook processing more flexible to handle different formats\n";
echo "3. Add fallback logic for different field names\n";
echo "4. Test with real PayChangu webhooks\n";
echo "5. Update code to handle PayChangu's actual format\n\n";

echo "6. FLEXIBLE WEBHOOK PROCESSING:\n";
echo "-------------------------------\n";

echo "Here's how we could make our webhook more flexible:\n\n";

$flexibleCode = '
// Flexible event type checking
$eventType = $data["event_type"] ?? $data["event"] ?? null;
$allowedEvents = ["api.charge.payment", "checkout.payment", "charge.success"];

// Flexible status checking  
$status = $data["status"] ?? $data["data"]["status"] ?? null;
$successStatuses = ["success", "successful", "completed"];

// Flexible amount handling
$amount = $data["amount"] ?? $data["data"]["amount"] ?? null;
if ($amount > 1000) { // Assume it\'s in cents
    $amount = $amount / 100;
}

// Flexible meta handling
$meta = $data["meta"] ?? [];
if (is_string($meta)) {
    $meta = json_decode($meta, true) ?: [];
}

// Flexible transaction ID
$transactionId = $data["tx_ref"] ?? $data["charge_id"] ?? $data["reference"] ?? $data["data"]["id"] ?? null;
';

echo $flexibleCode . "\n";

echo "🎯 CONCLUSION:\n";
echo "==============\n";
echo "We need to make our webhook processing more flexible to handle\n";
echo "PayChangu's actual format, which may differ from our expectations.\n";
echo "The current code is too rigid and may reject valid PayChangu webhooks.\n";
