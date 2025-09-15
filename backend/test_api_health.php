<?php

// Simple API health check
echo "🏥 Testing API Health...\n\n";

$baseUrl = 'https://docavailable-1.onrender.com/api';

// Test 1: Check if API is reachable
echo "1. Testing API reachability...\n";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $baseUrl . '/health');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/json'
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    echo "❌ Curl error: $curlError\n";
} else {
    echo "✅ API reachable (HTTP $httpCode)\n";
    if ($response) {
        $data = json_decode($response, true);
        echo "Response: " . json_encode($data, JSON_PRETTY_PRINT) . "\n";
    }
}

// Test 2: Check plans endpoint (should be public)
echo "\n2. Testing plans endpoint...\n";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $baseUrl . '/plans');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/json'
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Plans endpoint (HTTP $httpCode):\n";
if ($response) {
    $data = json_decode($response, true);
    if (isset($data['plans'])) {
        echo "✅ Plans endpoint working - Found " . count($data['plans']) . " plans\n";
        foreach ($data['plans'] as $plan) {
            echo "  - {$plan['name']}: \${$plan['price']} {$plan['currency']}\n";
        }
    } else {
        echo "❌ Unexpected response format\n";
        echo json_encode($data, JSON_PRETTY_PRINT) . "\n";
    }
} else {
    echo "❌ No response from plans endpoint\n";
}

// Test 3: Check subscription endpoint (should require auth)
echo "\n3. Testing subscription endpoint (should require auth)...\n";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $baseUrl . '/subscription');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/json'
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Subscription endpoint (HTTP $httpCode):\n";
if ($response) {
    $data = json_decode($response, true);
    if ($httpCode === 401) {
        echo "✅ Correctly requires authentication\n";
    } else {
        echo "Response: " . json_encode($data, JSON_PRETTY_PRINT) . "\n";
    }
} else {
    echo "❌ No response from subscription endpoint\n";
}

echo "\n✅ API health check complete!\n";

