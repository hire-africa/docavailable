<?php

echo "=== Testing Debug Config ===\n\n";

$url = 'https://docavailable-1.onrender.com/api/payments/debug-config';

$response = file_get_contents($url);
$httpCode = $http_response_header[0] ?? 'Unknown';

echo "URL: $url\n";
echo "HTTP Code: " . (strpos($httpCode, '200') !== false ? '200' : 'Error') . "\n";
echo "Response: " . $response . "\n\n";

echo "=== Test Complete ===\n";
