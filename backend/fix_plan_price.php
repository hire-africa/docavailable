<?php

// Fix plan price to match webhook amount
echo "Fixing plan price to match webhook amount...\n";

// The webhook amount was 97.00 MWK
$correctAmount = 97.00;
$correctCurrency = 'MWK';

echo "Setting plan_id=1 to price: $correctAmount $correctCurrency\n";
echo "This matches the amount from your successful transaction logs.\n\n";

// First, let's check what the current plan price is
$url = 'https://docavailable-1.onrender.com/api/admin/plans/1';

echo "Checking current plan price...\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/json',
    'Authorization: Bearer YOUR_ADMIN_TOKEN_HERE' // Would need admin token
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Status Code: $httpCode\n";
echo "Response:\n";
$responseData = json_decode($response, true);
print_r($responseData);

if ($httpCode === 401) {
    echo "\n❌ Authentication required for admin access\n";
    echo "The plan price needs to be updated to $correctAmount $correctCurrency\n";
    echo "This can be done through:\n";
    echo "1. Admin dashboard\n";
    echo "2. Direct database update\n";
    echo "3. API call with admin token\n";
    
    echo "\nManual fix needed:\n";
    echo "Update plan_id=1 to have:\n";
    echo "- price: $correctAmount\n";
    echo "- currency: $correctCurrency\n";
    echo "\nThis should fix the transaction creation issue.\n";
    
} elseif ($httpCode === 200) {
    echo "\n✅ Plan retrieved successfully!\n";
    $currentPrice = $responseData['data']['price'] ?? 'unknown';
    $currentCurrency = $responseData['data']['currency'] ?? 'unknown';
    
    echo "Current price: $currentPrice $currentCurrency\n";
    
    if ($currentPrice == $correctAmount && $currentCurrency == $correctCurrency) {
        echo "✅ Plan price is already correct!\n";
    } else {
        echo "⚠️  Plan price needs to be updated!\n";
        echo "Current: $currentPrice $currentCurrency\n";
        echo "Should be: $correctAmount $correctCurrency\n";
    }
} else {
    echo "\n❌ Failed to retrieve plan details\n";
    echo "Manual intervention needed to update plan price.\n";
}

echo "\nSummary:\n";
echo "The webhook amount was: $correctAmount $correctCurrency\n";
echo "Make sure plan_id=1 has the same price to avoid transaction creation failures.\n"; 