<?php

// Debug transaction creation to find the specific error
echo "🔍 Debugging Transaction Creation...\n\n";

$webhookUrl = 'https://docavailable-1.onrender.com/api/payments/test-webhook';

$testData = [
    'user_id' => 1,
    'plan_id' => 1,
    'reference' => 'DEBUG_TXN_' . time(),
    'amount' => 100.00,
    'currency' => 'MWK',
    'status' => 'pending'
];

echo "Testing transaction creation with data:\n";
print_r($testData);
echo "\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $webhookUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($testData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Status Code: $httpCode\n";
echo "Response:\n";
$responseData = json_decode($response, true);
print_r($responseData);

if ($httpCode === 200 && isset($responseData['success']) && $responseData['success']) {
    echo "\n✅ Transaction creation successful!\n";
    echo "The issue is in the main webhook, not transaction creation.\n";
} else {
    echo "\n❌ Transaction creation failed!\n";
    echo "This suggests a database issue.\n";
    
    if (isset($responseData['error'])) {
        echo "Error: " . $responseData['error'] . "\n";
        
        if (str_contains($responseData['error'], 'SQLSTATE')) {
            echo "🔍 This is a database constraint error.\n";
            echo "Possible causes:\n";
            echo "1. Missing database migrations\n";
            echo "2. Database connection issues\n";
            echo "3. Missing required fields\n";
            echo "4. Foreign key constraint violations\n";
        }
    }
}

echo "\n=== Next Steps ===\n";
echo "1. Check if all migrations have been run on the live server\n";
echo "2. Check if the database connection is working\n";
echo "3. Check if user_id=1 and plan_id=1 exist in the database\n";
echo "4. Check the backend logs for specific error messages\n"; 