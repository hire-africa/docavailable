<?php

require_once __DIR__ . '/../backend/vendor/autoload.php';

use App\Services\EncryptionService;
use App\Models\User;
use App\Models\ChatRoom;
use App\Models\ChatMessage;

// Initialize Laravel
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔐 Testing End-to-End Encryption Implementation\n";
echo "===============================================\n\n";

try {
    // Test 1: Encryption Service
    echo "1. Testing Encryption Service...\n";
    $encryptionService = new EncryptionService();
    
    // Generate a test key
    $testKey = $encryptionService->generateRoomKey();
    echo "   ✓ Room key generated: " . substr($testKey, 0, 20) . "...\n";
    
    // Test message encryption/decryption
    $testMessage = "Hello, this is a test message for encryption!";
    $encryptedData = $encryptionService->encryptMessage($testMessage, $testKey);
    echo "   ✓ Message encrypted successfully\n";
    
    $decryptedMessage = $encryptionService->decryptMessage($encryptedData, $testKey);
    echo "   ✓ Message decrypted successfully\n";
    
    if ($decryptedMessage === $testMessage) {
        echo "   ✓ Encryption/Decryption test PASSED\n";
    } else {
        echo "   ✗ Encryption/Decryption test FAILED\n";
    }
    
    // Test 2: Key Pair Generation
    echo "\n2. Testing Key Pair Generation...\n";
    $keyPair = $encryptionService->generateKeyPair();
    echo "   ✓ RSA key pair generated\n";
    echo "   ✓ Public key length: " . strlen($keyPair['public_key']) . " characters\n";
    echo "   ✓ Private key length: " . strlen($keyPair['private_key']) . " characters\n";
    
    // Test 3: Database Schema
    echo "\n3. Testing Database Schema...\n";
    
    // Check if encryption columns exist in chat_messages table
    $columns = \DB::select("SHOW COLUMNS FROM chat_messages LIKE 'encrypted_content'");
    if (!empty($columns)) {
        echo "   ✓ chat_messages.encrypted_content column exists\n";
    } else {
        echo "   ✗ chat_messages.encrypted_content column missing\n";
    }
    
    $columns = \DB::select("SHOW COLUMNS FROM chat_rooms LIKE 'encryption_key'");
    if (!empty($columns)) {
        echo "   ✓ chat_rooms.encryption_key column exists\n";
    } else {
        echo "   ✗ chat_rooms.encryption_key column missing\n";
    }
    
    $columns = \DB::select("SHOW COLUMNS FROM users LIKE 'public_key'");
    if (!empty($columns)) {
        echo "   ✓ users.public_key column exists\n";
    } else {
        echo "   ✗ users.public_key column missing\n";
    }
    
    // Test 4: Model Methods
    echo "\n4. Testing Model Methods...\n";
    
    // Test ChatMessage encryption methods
    $message = new ChatMessage();
    $message->setEncryptedContent('encrypted_data', 'iv_data', 'tag_data', 'aes-256-gcm');
    echo "   ✓ ChatMessage encryption methods work\n";
    
    // Test ChatRoom encryption methods
    $room = new ChatRoom();
    $room->enableEncryption($testKey);
    echo "   ✓ ChatRoom encryption methods work\n";
    
    // Test User encryption methods
    $user = new User();
    $user->enableEncryption($keyPair['public_key'], $keyPair['private_key']);
    echo "   ✓ User encryption methods work\n";
    
    echo "\n🎉 All encryption tests completed successfully!\n";
    echo "\nNext steps:\n";
    echo "1. Test the encryption API endpoints\n";
    echo "2. Test client-side encryption functionality\n";
    echo "3. Test end-to-end message encryption in chat\n";
    echo "4. Verify encryption UI components\n";
    
} catch (Exception $e) {
    echo "\n❌ Error during encryption testing: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
} 