<?php

// Test to check production server's database configuration
echo "🔍 Checking Production Server Database Configuration...\n\n";

$ch = curl_init('https://docavailable-1.onrender.com/api/payments/debug-config');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Accept: application/json']);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Status Code: $httpCode\n";
echo "Response:\n";
$responseData = json_decode($response, true);
print_r($responseData);

if ($httpCode === 200 && isset($responseData['success']) && $responseData['success']) {
    echo "\n🎉 SUCCESS: Got production server configuration!\n";
    echo "Database Host: " . $responseData['debug_info']['db_host'] . "\n";
    echo "Database Connection: " . $responseData['debug_info']['db_connection'] . "\n";
    echo "Default Connection: " . $responseData['debug_info']['default_connection'] . "\n";
} else {
    echo "\n❌ FAILED: Could not get production server configuration\n";
    echo "Error: " . ($responseData['error'] ?? 'Unknown error') . "\n";
}
