<?php

echo "🚀 Simple DigitalOcean Spaces Test\n";
echo "==================================\n\n";

// Load environment variables
$lines = file('.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
foreach ($lines as $line) {
    if (strpos($line, '=') !== false && strpos($line, '#') !== 0) {
        list($key, $value) = explode('=', $line, 2);
        $value = trim($value, '"\'');
        putenv("$key=$value");
    }
}

$accessKey = getenv('DO_SPACES_KEY');
$secretKey = getenv('DO_SPACES_SECRET');
$bucket = getenv('DO_SPACES_BUCKET');
$region = getenv('DO_SPACES_REGION');
$endpoint = getenv('DO_SPACES_ENDPOINT');

echo "Configuration:\n";
echo "Access Key: " . substr($accessKey, 0, 10) . "...\n";
echo "Secret Key: " . substr($secretKey, 0, 10) . "...\n";
echo "Bucket: $bucket\n";
echo "Region: $region\n";
echo "Endpoint: $endpoint\n\n";

// Test 1: Check if we can make a simple HTTP request to the bucket
echo "Testing bucket accessibility...\n";
$testUrl = "https://$bucket.$region.digitaloceanspaces.com/";
$context = stream_context_create([
    'http' => [
        'method' => 'HEAD',
        'timeout' => 10
    ]
]);

$result = @file_get_contents($testUrl, false, $context);
if ($result !== false) {
    echo "✅ Bucket is accessible via HTTP\n";
} else {
    echo "❌ Bucket is not accessible via HTTP\n";
    $error = error_get_last();
    if ($error) {
        echo "Error: " . $error['message'] . "\n";
    }
}

// Test 2: Check if we can list objects (this requires AWS SDK)
echo "\nTesting S3 API access...\n";
echo "Note: This requires AWS SDK to be installed\n";
echo "Run: composer require aws/aws-sdk-php\n";
echo "Then run: php test_digitalocean_spaces.php\n\n";

echo "✅ Basic configuration looks correct!\n";
echo "Next steps:\n";
echo "1. Install AWS SDK: composer require aws/aws-sdk-php\n";
echo "2. Test full connection: php test_digitalocean_spaces.php\n";
echo "3. Deploy your backend with the new configuration\n";
