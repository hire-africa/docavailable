<?php

// Test script to verify subscription fix
echo "🧪 Testing Subscription Fix...\n\n";

// Test the subscription API endpoint
$apiUrl = 'https://docavailable-1.onrender.com/api/subscription';

echo "Testing subscription API endpoint: $apiUrl\n";

// First, we need to get a valid token by logging in
$loginUrl = 'https://docavailable-1.onrender.com/api/login';
$loginData = [
    'email' => 'patient@example.com', // Use a valid patient user
    'password' => 'password' // Assuming this is the default password
];

echo "Logging in to get token...\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $loginUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($loginData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);

$loginResponse = curl_exec($ch);
$loginHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Login response (HTTP $loginHttpCode):\n";
$loginData = json_decode($loginResponse, true);
print_r($loginData);

if ($loginHttpCode === 200 && isset($loginData['access_token'])) {
    $token = $loginData['access_token'];
    echo "\n✅ Login successful, got token\n";
    
    // Now test the subscription endpoint
    echo "\nTesting subscription endpoint with token...\n";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $token,
        'Accept: application/json'
    ]);
    
    $subscriptionResponse = curl_exec($ch);
    $subscriptionHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    echo "Subscription response (HTTP $subscriptionHttpCode):\n";
    $subscriptionData = json_decode($subscriptionResponse, true);
    print_r($subscriptionData);
    
    if ($subscriptionHttpCode === 200) {
        if (isset($subscriptionData['success']) && $subscriptionData['success']) {
            if ($subscriptionData['data']) {
                echo "\n✅ SUCCESS: Subscription data returned correctly!\n";
                echo "Subscription ID: " . $subscriptionData['data']['id'] . "\n";
                echo "Plan Name: " . $subscriptionData['data']['planName'] . "\n";
                echo "Is Active: " . ($subscriptionData['data']['isActive'] ? 'Yes' : 'No') . "\n";
                echo "Text Sessions Remaining: " . $subscriptionData['data']['textSessionsRemaining'] . "\n";
            } else {
                echo "\nℹ️ User has no subscription (this is normal for new users)\n";
            }
        } else {
            echo "\n❌ API returned success=false\n";
            echo "Message: " . ($subscriptionData['message'] ?? 'No message') . "\n";
        }
    } else {
        echo "\n❌ Subscription API returned HTTP $subscriptionHttpCode\n";
        if (isset($subscriptionData['error'])) {
            echo "Error: " . $subscriptionData['error'] . "\n";
        }
    }
    
} else {
    echo "\n❌ Login failed\n";
    echo "HTTP Code: $loginHttpCode\n";
    if (isset($loginData['message'])) {
        echo "Message: " . $loginData['message'] . "\n";
    }
    
    // Try with a different user
    echo "\nTrying with a different user...\n";
    $loginData = [
        'email' => 'test@example.com',
        'password' => 'password'
    ];
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $loginUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($loginData));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Accept: application/json'
    ]);
    
    $loginResponse = curl_exec($ch);
    $loginHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    echo "Second login attempt (HTTP $loginHttpCode):\n";
    $loginData = json_decode($loginResponse, true);
    print_r($loginData);
}

echo "\n🔍 Summary:\n";
echo "1. Check if login works (should return 200 with access_token)\n";
echo "2. Check if subscription endpoint works (should return 200)\n";
echo "3. Check if subscription data is properly formatted\n";
echo "4. Check backend logs for any subscription-related errors\n";
echo "5. Check frontend console for subscription loading logs\n";
