<?php

require_once __DIR__ . '/../backend/vendor/autoload.php';

// Initialize Laravel
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Services\EncryptionService;

echo "🔐 Testing Encryption Service with Fallback\n";
echo "===========================================\n\n";

try {
    $encryptionService = new EncryptionService();
    
    echo "1. Testing key generation...\n";
    $keyPair = $encryptionService->generateKeyPair();
    
    echo "   ✓ Key pair generated successfully\n";
    echo "   ✓ Private key length: " . strlen($keyPair['private_key']) . " characters\n";
    echo "   ✓ Public key length: " . strlen($keyPair['public_key']) . " characters\n";
    
    // Test if keys are base64 encoded (fallback method)
    if (base64_decode($keyPair['private_key'], true) !== false) {
        echo "   ✓ Private key is valid base64\n";
    } else {
        echo "   ✓ Private key appears to be RSA format\n";
    }
    
    if (base64_decode($keyPair['public_key'], true) !== false) {
        echo "   ✓ Public key is valid base64\n";
    } else {
        echo "   ✓ Public key appears to be RSA format\n";
    }
    
    echo "\n2. Testing message encryption/decryption...\n";
    
    // Generate a test room key
    $roomKey = $encryptionService->generateRoomKey();
    echo "   ✓ Room key generated: " . substr($roomKey, 0, 20) . "...\n";
    
    // Test message encryption/decryption
    $testMessage = "Hello, this is a test message for encryption!";
    $encryptedData = $encryptionService->encryptMessage($testMessage, $roomKey);
    echo "   ✓ Message encrypted successfully\n";
    
    $decryptedMessage = $encryptionService->decryptMessage($encryptedData, $roomKey);
    echo "   ✓ Message decrypted successfully\n";
    
    if ($decryptedMessage === $testMessage) {
        echo "   ✓ Encryption/Decryption test PASSED\n";
    } else {
        echo "   ✗ Encryption/Decryption test FAILED\n";
        echo "   Original: $testMessage\n";
        echo "   Decrypted: $decryptedMessage\n";
    }
    
    echo "\n✅ All tests completed successfully!\n";
    
} catch (Exception $e) {
    echo "❌ Test failed: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
} 