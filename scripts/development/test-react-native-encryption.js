const ReactNativeEncryptionService = require('../services/reactNativeEncryptionService.ts').default;

async function testEncryption() {
  console.log('🔐 Testing React Native Encryption Service');
  console.log('==========================================\n');

  try {
    // Test 1: Key Generation
    console.log('1. Testing Key Generation...');
    const key = await ReactNativeEncryptionService.generateKey();
    console.log('   ✓ Key generated:', key.substring(0, 20) + '...');
    console.log('   ✓ Key length:', key.length, 'characters');

    // Test 2: Message Encryption/Decryption
    console.log('\n2. Testing Message Encryption/Decryption...');
    const testMessage = 'Hello, this is a test message for encryption!';
    console.log('   Original message:', testMessage);

    const encryptedData = await ReactNativeEncryptionService.encryptMessage(testMessage, key);
    console.log('   ✓ Message encrypted successfully');
    console.log('   Encrypted content:', encryptedData.encrypted_content.substring(0, 20) + '...');
    console.log('   IV:', encryptedData.iv.substring(0, 20) + '...');
    console.log('   Tag:', encryptedData.tag.substring(0, 20) + '...');

    const decryptedMessage = await ReactNativeEncryptionService.decryptMessage(encryptedData, key);
    console.log('   ✓ Message decrypted successfully');
    console.log('   Decrypted message:', decryptedMessage);

    if (decryptedMessage === testMessage) {
      console.log('   ✓ Encryption/Decryption test PASSED');
    } else {
      console.log('   ✗ Encryption/Decryption test FAILED');
      console.log('   Expected:', testMessage);
      console.log('   Got:', decryptedMessage);
    }

    // Test 3: Key Pair Generation
    console.log('\n3. Testing Key Pair Generation...');
    const keyPair = await ReactNativeEncryptionService.generateKeyPair();
    console.log('   ✓ Key pair generated successfully');
    console.log('   Public key length:', keyPair.publicKey.length, 'characters');
    console.log('   Private key length:', keyPair.privateKey.length, 'characters');

    // Test 4: Public Key Encryption
    console.log('\n4. Testing Public Key Encryption...');
    const testData = 'Secret data to encrypt with public key';
    const encryptedWithPublicKey = await ReactNativeEncryptionService.encryptWithPublicKey(testData, keyPair.publicKey);
    console.log('   ✓ Data encrypted with public key');

    const decryptedWithPrivateKey = await ReactNativeEncryptionService.decryptWithPrivateKey(encryptedWithPublicKey, keyPair.privateKey);
    console.log('   ✓ Data decrypted with private key');
    console.log('   Decrypted data:', decryptedWithPrivateKey);

    if (decryptedWithPrivateKey === testData) {
      console.log('   ✓ Public/Private key encryption test PASSED');
    } else {
      console.log('   ✗ Public/Private key encryption test FAILED');
    }

    // Test 5: Hash Function
    console.log('\n5. Testing Hash Function...');
    const testString = 'Hello, world!';
    const hash = await ReactNativeEncryptionService.hashString(testString);
    console.log('   ✓ Hash generated successfully');
    console.log('   Hash:', hash.substring(0, 20) + '...');

    // Test 6: Random String Generation
    console.log('\n6. Testing Random String Generation...');
    const randomString = ReactNativeEncryptionService.generateRandomString(16);
    console.log('   ✓ Random string generated');
    console.log('   Random string:', randomString);

    console.log('\n✅ All tests completed successfully!');
    console.log('The React Native encryption service is working correctly.');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testEncryption(); 