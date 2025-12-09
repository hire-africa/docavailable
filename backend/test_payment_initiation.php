<?php

// Test payment initiation endpoint
echo "Testing payment initiation...\n";

$url = 'https://docavailable-1.onrender.com/api/payments/paychangu/initiate';

$data = [
    'plan_id' => 1
];

echo "Request data:\n";
print_r($data);
echo "\n";

// Make the request
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json',
    'Authorization: Bearer YOUR_TOKEN_HERE' // This needs a real token
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Status Code: $httpCode\n";
echo "Response:\n";
$responseData = json_decode($response, true);
print_r($responseData);

if ($httpCode === 401) {
    echo "\n❌ Authentication required - need a valid token\n";
    echo "This means the endpoint is working but requires authentication.\n";
} elseif ($httpCode === 200 && isset($responseData['success']) && $responseData['success']) {
    echo "\n✅ Payment initiation successful!\n";
    echo "Transaction Reference: " . $responseData['tx_ref'] . "\n";
    echo "Checkout URL: " . $responseData['checkout_url'] . "\n";
    
    // Now test if the transaction was created
    echo "\nTesting if transaction was created...\n";
    $statusUrl = 'https://docavailable-1.onrender.com/api/payments/status?transaction_id=' . $responseData['tx_ref'];
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $statusUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Accept: application/json'
    ]);
    
    $statusResponse = curl_exec($ch);
    $statusHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    echo "Status HTTP Code: $statusHttpCode\n";
    echo "Status Response:\n";
    $statusData = json_decode($statusResponse, true);
    print_r($statusData);
    
} else {
    echo "\n❌ Payment initiation failed!\n";
} 