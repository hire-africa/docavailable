<?php

// Test what routes are actually available on the backend
$apiUrl = 'https://docavailable-3vbdv.ondigitalocean.app/api';

echo "=== BACKEND ROUTES TEST ===\n";

// Test different HTTP methods on call-sessions endpoints
$endpoints = [
    '/call-sessions/start',
    '/call-sessions/check-availability',
    '/call-sessions/end'
];

$methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];

foreach ($endpoints as $endpoint) {
    echo "\n--- Testing $endpoint ---\n";
    foreach ($methods as $method) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $apiUrl . $endpoint);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Accept: application/json'
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        echo "$method: $httpCode";
        if ($httpCode === 200 || $httpCode === 201) {
            echo " ✅";
        } else if ($httpCode === 401) {
            echo " (Auth required)";
        } else if ($httpCode === 405) {
            echo " (Method not allowed)";
        } else if ($httpCode === 404) {
            echo " (Not found)";
        }
        echo "\n";
    }
}

// Test if the routes file exists by checking a known working endpoint
echo "\n--- Testing known working endpoint ---\n";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $apiUrl . '/health');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Health endpoint: $httpCode\n";
if ($httpCode === 200) {
    echo "Response: $response\n";
}
