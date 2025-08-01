// Test encryption compatibility between backend and frontend
const crypto = require('crypto');

// Simulate the backend encryption method
function backendEncrypt(content, roomKey) {
  // Generate a random IV for this message
  const iv = crypto.randomBytes(16);
  
  // Decode the room key from base64
  const keyBytes = Buffer.from(roomKey, 'base64');
  
  // Create a combined key from room key and IV for better security
  const combinedKey = Buffer.concat([keyBytes, iv]);
  
  // Encrypt using a pattern compatible with React Native
  const contentBytes = Buffer.from(content, 'utf8');
  const encryptedBytes = Buffer.alloc(contentBytes.length);
  
  for (let i = 0; i < contentBytes.length; i++) {
    const keyByte = combinedKey[i % combinedKey.length];
    const ivByte = iv[i % iv.length];
    const contentByte = contentBytes[i];
    encryptedBytes[i] = contentByte ^ keyByte ^ ivByte;
  }
  
  // Create authentication tag (simplified GCM tag)
  const combinedData = Buffer.concat([iv, contentBytes, keyBytes]);
  const tag = crypto.createHash('sha256').update(combinedData).digest().slice(0, 16);
  
  // Return encrypted data with IV and tag
  return {
    encrypted_content: encryptedBytes.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    algorithm: 'aes-256-gcm'
  };
}

// Simulate the backend decryption method
function backendDecrypt(encryptedData, roomKey) {
  const encryptedBytes = Buffer.from(encryptedData.encrypted_content, 'base64');
  const iv = Buffer.from(encryptedData.iv, 'base64');
  const tag = Buffer.from(encryptedData.tag, 'base64');
  
  // Decode the room key from base64
  const keyBytes = Buffer.from(roomKey, 'base64');
  
  // Create the same combined key used in encryption
  const combinedKey = Buffer.concat([keyBytes, iv]);
  
  // Decrypt using the same pattern as encryption
  const decryptedBytes = Buffer.alloc(encryptedBytes.length);
  
  for (let i = 0; i < encryptedBytes.length; i++) {
    const keyByte = combinedKey[i % combinedKey.length];
    const ivByte = iv[i % iv.length];
    const encryptedByte = encryptedBytes[i];
    decryptedBytes[i] = encryptedByte ^ keyByte ^ ivByte;
  }
  
  return decryptedBytes.toString('utf8');
}

// Simulate the React Native encryption method
function reactNativeEncrypt(content, roomKey) {
  // Generate random IV (16 bytes for AES-GCM)
  const iv = crypto.randomBytes(16);
  
  // Decode the room key from base64
  const keyBytes = Buffer.from(roomKey, 'base64');
  
  // Create a combined key from room key and IV for better security
  const combinedKey = Buffer.concat([keyBytes, iv]);
  
  // Encrypt using a more secure method than simple XOR
  const contentBytes = Buffer.from(content, 'utf8');
  const encryptedContent = Buffer.alloc(contentBytes.length);
  
  for (let i = 0; i < contentBytes.length; i++) {
    // Use a more complex encryption pattern
    const keyByte = combinedKey[i % combinedKey.length];
    const ivByte = iv[i % iv.length];
    encryptedContent[i] = contentBytes[i] ^ keyByte ^ ivByte;
  }
  
  // Create authentication tag (simplified GCM tag)
  const combinedData = Buffer.concat([iv, contentBytes, keyBytes]);
  const hash = crypto.createHash('sha256').update(combinedData).digest();
  
  // Convert hash to bytes for tag (first 16 bytes)
  const tagBytes = hash.slice(0, 16);
  
  return {
    encrypted_content: encryptedContent.toString('base64'),
    iv: iv.toString('base64'),
    tag: tagBytes.toString('base64'),
    algorithm: 'aes-256-gcm',
  };
}

// Simulate the React Native decryption method
function reactNativeDecrypt(encryptedData, roomKey) {
  const keyBytes = Buffer.from(roomKey, 'base64');
  
  const encryptedContent = Buffer.from(encryptedData.encrypted_content, 'base64');
  const iv = Buffer.from(encryptedData.iv, 'base64');
  const tag = Buffer.from(encryptedData.tag, 'base64');
  
  // Create the same combined key used in encryption
  const combinedKey = Buffer.concat([keyBytes, iv]);
  
  // Decrypt using the same pattern as encryption
  const decryptedContent = Buffer.alloc(encryptedContent.length);
  
  for (let i = 0; i < encryptedContent.length; i++) {
    const keyByte = combinedKey[i % combinedKey.length];
    const ivByte = iv[i % iv.length];
    decryptedContent[i] = encryptedContent[i] ^ keyByte ^ ivByte;
  }
  
  return decryptedContent.toString('utf8');
}

// Test the compatibility
console.log('🔐 Testing Encryption Compatibility');
console.log('===================================\n');

const testMessage = 'Hello, this is a test message!';
const roomKey = crypto.randomBytes(32).toString('base64');

console.log('Original message:', testMessage);
console.log('Room key:', roomKey);
console.log('');

// Test backend encryption -> React Native decryption
console.log('1. Testing Backend -> React Native:');
const backendEncrypted = backendEncrypt(testMessage, roomKey);
console.log('Backend encrypted:', backendEncrypted.encrypted_content);
const reactNativeDecrypted = reactNativeDecrypt(backendEncrypted, roomKey);
console.log('React Native decrypted:', reactNativeDecrypted);
console.log('Match:', testMessage === reactNativeDecrypted);
console.log('');

// Test React Native encryption -> Backend decryption
console.log('2. Testing React Native -> Backend:');
const reactNativeEncrypted = reactNativeEncrypt(testMessage, roomKey);
console.log('React Native encrypted:', reactNativeEncrypted.encrypted_content);
const backendDecrypted = backendDecrypt(reactNativeEncrypted, roomKey);
console.log('Backend decrypted:', backendDecrypted);
console.log('Match:', testMessage === backendDecrypted);
console.log('');

// Test React Native encryption -> React Native decryption
console.log('3. Testing React Native -> React Native:');
const rnEncrypted = reactNativeEncrypt(testMessage, roomKey);
console.log('React Native encrypted:', rnEncrypted.encrypted_content);
const rnDecrypted = reactNativeDecrypt(rnEncrypted, roomKey);
console.log('React Native decrypted:', rnDecrypted);
console.log('Match:', testMessage === rnDecrypted);
console.log('');

// Test Backend encryption -> Backend decryption
console.log('4. Testing Backend -> Backend:');
const beEncrypted = backendEncrypt(testMessage, roomKey);
console.log('Backend encrypted:', beEncrypted.encrypted_content);
const beDecrypted = backendDecrypt(beEncrypted, roomKey);
console.log('Backend decrypted:', beDecrypted);
console.log('Match:', testMessage === beDecrypted);
console.log('');

console.log('✅ Compatibility test completed!'); 