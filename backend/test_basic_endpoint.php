<?php

echo "🔍 Testing Basic Laravel Endpoints...\n\n";

// Test basic health check
$ch = curl_init('https://docavailable-1.onrender.com/api/health');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Accept: application/json']);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Health Check - HTTP Status Code: $httpCode\n";
echo "Response: $response\n\n";

// Test a simple API endpoint
$ch = curl_init('https://docavailable-1.onrender.com/api/test');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Accept: application/json']);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Test Endpoint - HTTP Status Code: $httpCode\n";
echo "Response: $response\n\n";

// Test the root endpoint
$ch = curl_init('https://docavailable-1.onrender.com/');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Root Endpoint - HTTP Status Code: $httpCode\n";
echo "Response: " . substr($response, 0, 200) . "...\n\n";
