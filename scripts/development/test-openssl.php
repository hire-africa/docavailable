<?php

echo "🔍 OpenSSL Diagnostic Test\n";
echo "==========================\n\n";

// Test 1: Check if OpenSSL extension is loaded
echo "1. Checking OpenSSL extension...\n";
if (extension_loaded('openssl')) {
    echo "   ✓ OpenSSL extension is loaded\n";
    echo "   ✓ OpenSSL version: " . OPENSSL_VERSION_TEXT . "\n";
} else {
    echo "   ✗ OpenSSL extension is NOT loaded\n";
    exit(1);
}

// Test 2: Check OpenSSL configuration
echo "\n2. Checking OpenSSL configuration...\n";
$opensslConfigPath = openssl_get_cert_locations();
if ($opensslConfigPath) {
    echo "   ✓ OpenSSL configuration found\n";
    if (isset($opensslConfigPath['default_cert_file'])) {
        echo "   ✓ Default cert file: " . $opensslConfigPath['default_cert_file'] . "\n";
    }
} else {
    echo "   ⚠️ OpenSSL configuration not found\n";
}

// Test 3: Test basic key generation with different configurations
echo "\n3. Testing key generation...\n";

$configs = [
    'minimal' => [
        'private_key_bits' => 1024,
        'private_key_type' => OPENSSL_KEYTYPE_RSA,
    ],
    'standard' => [
        'digest_alg' => 'sha256',
        'private_key_bits' => 2048,
        'private_key_type' => OPENSSL_KEYTYPE_RSA,
    ],
    'high_security' => [
        'digest_alg' => 'sha512',
        'private_key_bits' => 4096,
        'private_key_type' => OPENSSL_KEYTYPE_RSA,
    ]
];

foreach ($configs as $name => $config) {
    echo "   Testing $name configuration...\n";
    
    try {
        $res = openssl_pkey_new($config);
        
        if ($res === false) {
            $errors = [];
            while ($error = openssl_error_string()) {
                $errors[] = $error;
            }
            echo "     ✗ Failed: " . implode(', ', $errors) . "\n";
        } else {
            echo "     ✓ Success\n";
            
            // Test export
            $privateKey = '';
            if (openssl_pkey_export($res, $privateKey)) {
                echo "     ✓ Private key export successful\n";
            } else {
                echo "     ✗ Private key export failed\n";
            }
            
            // Test public key extraction
            $keyDetails = openssl_pkey_get_details($res);
            if ($keyDetails && isset($keyDetails['key'])) {
                echo "     ✓ Public key extraction successful\n";
            } else {
                echo "     ✗ Public key extraction failed\n";
            }
            
            openssl_pkey_free($res);
        }
    } catch (Exception $e) {
        echo "     ✗ Exception: " . $e->getMessage() . "\n";
    }
}

// Test 4: Check system resources
echo "\n4. Checking system resources...\n";
$memoryLimit = ini_get('memory_limit');
$maxExecutionTime = ini_get('max_execution_time');
echo "   Memory limit: $memoryLimit\n";
echo "   Max execution time: $maxExecutionTime seconds\n";

// Test 5: Check if we can generate random bytes
echo "\n5. Testing random byte generation...\n";
try {
    $randomBytes = random_bytes(32);
    echo "   ✓ Random bytes generation successful\n";
    echo "   ✓ Generated " . strlen($randomBytes) . " bytes\n";
} catch (Exception $e) {
    echo "   ✗ Random bytes generation failed: " . $e->getMessage() . "\n";
}

echo "\n✅ Diagnostic test completed\n"; 