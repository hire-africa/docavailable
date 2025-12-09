<?php
/**
 * Debug script for email verification process
 * This script helps test the verification code generation and storage
 */

require_once 'backend/vendor/autoload.php';

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

// Bootstrap Laravel
$app = require_once 'backend/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== Email Verification Debug Script ===\n\n";

// Test email
$testEmail = 'test@example.com';
$cacheKey = 'email_verification_' . $testEmail;

echo "1. Testing code generation...\n";
$code = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
echo "Generated code: '$code' (length: " . strlen($code) . ")\n";
echo "Code type: " . gettype($code) . "\n\n";

echo "2. Testing cache storage...\n";
Cache::put($cacheKey, $code, now()->addMinutes(10));
echo "Code stored in cache with key: $cacheKey\n\n";

echo "3. Testing cache retrieval...\n";
$retrievedCode = Cache::get($cacheKey);
echo "Retrieved code: '$retrievedCode' (length: " . strlen($retrievedCode) . ")\n";
echo "Retrieved code type: " . gettype($retrievedCode) . "\n";
echo "Codes match: " . ($code === $retrievedCode ? 'YES' : 'NO') . "\n\n";

echo "4. Testing string comparison...\n";
$normalizedCode = (string) $code;
$normalizedRetrieved = (string) $retrievedCode;
echo "Normalized original: '$normalizedCode'\n";
echo "Normalized retrieved: '$normalizedRetrieved'\n";
echo "Normalized match: " . ($normalizedCode === $normalizedRetrieved ? 'YES' : 'NO') . "\n\n";

echo "5. Testing with different input formats...\n";
$testInputs = [
    $code,
    ' ' . $code . ' ',
    (string) $code,
    (int) $code,
    strval($code)
];

foreach ($testInputs as $i => $testInput) {
    echo "Test $i: Input='$testInput' (type: " . gettype($testInput) . ")\n";
    echo "  Trimmed: '" . trim($testInput) . "'\n";
    echo "  Matches original: " . (trim($testInput) === $code ? 'YES' : 'NO') . "\n";
    echo "  Matches retrieved: " . (trim($testInput) === $retrievedCode ? 'YES' : 'NO') . "\n\n";
}

echo "6. Testing regex validation...\n";
foreach ($testInputs as $i => $testInput) {
    $trimmed = trim($testInput);
    $isValid = preg_match('/^\d{6}$/', $trimmed);
    echo "Test $i: '$trimmed' -> Valid: " . ($isValid ? 'YES' : 'NO') . "\n";
}

echo "\n=== Debug Complete ===\n";
