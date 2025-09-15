<?php

echo "🔍 Verifying PayChangu Configuration...\n\n";

// Read .env file
function getEnvValue($key, $default = '') {
    $envFile = __DIR__ . '/.env';
    if (!file_exists($envFile)) {
        return $default;
    }
    
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '#') === 0 || empty($line)) {
            continue;
        }
        
        list($envKey, $envValue) = explode('=', $line, 2);
        if (trim($envKey) === $key) {
            return trim(str_replace('"', '', $envValue));
        }
    }
    
    return $default;
}

// Configuration to verify
$config = [
    'webhook_url' => getEnvValue('PAYCHANGU_WEBHOOK_SECRET', ''),
    'public_key' => getEnvValue('PAYCHANGU_PUBLIC_KEY', ''),
    'secret_key' => getEnvValue('PAYCHANGU_SECRET_KEY', ''),
    'payment_url' => getEnvValue('PAYCHANGU_PAYMENT_URL', ''),
    'verify_url' => getEnvValue('PAYCHANGU_VERIFY_URL', ''),
    'callback_url' => getEnvValue('PAYCHANGU_CALLBACK_URL', ''),
    'return_url' => getEnvValue('PAYCHANGU_RETURN_URL', ''),
    'environment' => getEnvValue('PAYCHANGU_ENVIRONMENT', '')
];

echo "Current PayChangu Configuration:\n";
foreach ($config as $key => $value) {
    echo str_pad($key . ': ', 20) . $value . "\n";
}

// Verify webhook URL format
$webhookUrl = $config['webhook_url'];
if (filter_var($webhookUrl, FILTER_VALIDATE_URL)) {
    echo "\n✅ Webhook URL is valid\n";
    
    $parsedUrl = parse_url($webhookUrl);
    if ($parsedUrl['scheme'] === 'https') {
        echo "✅ Webhook URL uses HTTPS (required for production)\n";
    } else {
        echo "❌ Warning: Webhook URL should use HTTPS in production\n";
    }
    
    // Check if webhook URL matches the APP_URL domain
    $appUrl = getEnvValue('APP_URL', '');
    if (strpos($webhookUrl, parse_url($appUrl, PHP_URL_HOST)) !== false) {
        echo "✅ Webhook URL matches APP_URL domain\n";
    } else {
        echo "❌ Warning: Webhook URL domain doesn't match APP_URL domain\n";
    }
} else {
    echo "\n❌ Invalid webhook URL format\n";
}

// Verify public/secret keys format
if (strpos($config['public_key'], 'pub-') === 0) {
    echo "\n✅ Public key format is valid\n";
} else {
    echo "\n❌ Invalid public key format (should start with 'pub-')\n";
}

if (strpos($config['secret_key'], 'sec-') === 0) {
    echo "✅ Secret key format is valid\n";
} else {
    echo "❌ Invalid secret key format (should start with 'sec-')\n";
}

// Test webhook endpoint
echo "\n🔍 Testing webhook endpoint...\n";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $webhookUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_NOBODY, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Webhook endpoint response code: $httpCode\n";
if ($httpCode === 405) {
    echo "✅ Webhook endpoint exists (responds with 405 Method Not Allowed for GET requests)\n";
} elseif ($httpCode === 404) {
    echo "❌ Warning: Webhook endpoint not found (404)\n";
} else {
    echo "ℹ️ Webhook endpoint returned status code: $httpCode\n";
}