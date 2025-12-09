<?php
/**
 * Test Google Login Endpoint
 * This script tests the Google login endpoint to see what response we get
 */

// Test the Google login endpoint
$url = 'https://docavailable-3vbdv.ondigitalocean.app/api/auth/google-login';
$data = [
    'id_token' => 'test_token_123',
    'user_type' => 'patient'
];

$options = [
    'http' => [
        'header' => "Content-Type: application/json\r\n",
        'method' => 'POST',
        'content' => json_encode($data)
    ]
];

$context = stream_context_create($options);
$result = file_get_contents($url, false, $context);

echo "Response Headers:\n";
if (isset($http_response_header)) {
    foreach ($http_response_header as $header) {
        echo $header . "\n";
    }
}

echo "\nResponse Body:\n";
echo $result . "\n";

// Check if it's HTML
if (strpos($result, '<!DOCTYPE html>') !== false) {
    echo "\n❌ Server returned HTML instead of JSON - this indicates a server error\n";
} else {
    echo "\n✅ Server returned JSON response\n";
}
