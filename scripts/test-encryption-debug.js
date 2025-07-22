const crypto = require('crypto');

// Test base64 encoding/decoding
function testBase64() {
  console.log('Testing base64 encoding/decoding...');
  
  const testString = 'Hello, World! This is a test message.';
  const encoder = new TextEncoder();
  const bytes = encoder.encode(testString);
  
  // Simple base64 encoding
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let encoded = '';
  let i = 0;
  
  while (i < bytes.length) {
    const byte1 = bytes[i++];
    const byte2 = i < bytes.length ? bytes[i++] : 0;
    const byte3 = i < bytes.length ? bytes[i++] : 0;
    
    const chunk1 = byte1 >> 2;
    const chunk2 = ((byte1 & 3) << 4) | (byte2 >> 4);
    const chunk3 = ((byte2 & 15) << 2) | (byte3 >> 6);
    const chunk4 = byte3 & 63;
    
    encoded += chars[chunk1] + chars[chunk2] + chars[chunk3] + chars[chunk4];
  }
  
  // Add padding
  const padding = bytes.length % 3;
  if (padding > 0) {
    encoded = encoded.slice(0, -padding) + '='.repeat(padding);
  }
  
  console.log('Original:', testString);
  console.log('Encoded:', encoded);
  
  // Decode
  const decodedBytes = [];
  encoded = encoded.replace(/=/g, '');
  
  for (let i = 0; i < encoded.length; i += 4) {
    const chunk1 = chars.indexOf(encoded[i]);
    const chunk2 = chars.indexOf(encoded[i + 1]);
    const chunk3 = chars.indexOf(encoded[i + 2]);
    const chunk4 = chars.indexOf(encoded[i + 3]);
    
    if (chunk1 === -1 || chunk2 === -1) continue;
    
    const byte1 = (chunk1 << 2) | (chunk2 >> 4);
    decodedBytes.push(byte1);
    
    if (chunk3 !== -1) {
      const byte2 = ((chunk2 & 15) << 4) | (chunk3 >> 2);
      decodedBytes.push(byte2);
      
      if (chunk4 !== -1) {
        const byte3 = ((chunk3 & 3) << 6) | chunk4;
        decodedBytes.push(byte3);
      }
    }
  }
  
  const decoder = new TextDecoder();
  const decoded = decoder.decode(new Uint8Array(decodedBytes));
  
  console.log('Decoded:', decoded);
  console.log('Match:', testString === decoded);
  console.log('');
}

// Test simple encryption/decryption
function testEncryption() {
  console.log('Testing simple encryption/decryption...');
  
  const message = 'Hello, this is a test message!';
  const key = crypto.randomBytes(32);
  
  console.log('Original message:', message);
  console.log('Key length:', key.length);
  
  // Simple XOR encryption
  const encoder = new TextEncoder();
  const messageBytes = encoder.encode(message);
  const encrypted = new Uint8Array(messageBytes.length);
  
  for (let i = 0; i < messageBytes.length; i++) {
    encrypted[i] = messageBytes[i] ^ key[i % key.length];
  }
  
  console.log('Encrypted bytes:', Array.from(encrypted.slice(0, 10)));
  
  // Decrypt
  const decrypted = new Uint8Array(encrypted.length);
  for (let i = 0; i < encrypted.length; i++) {
    decrypted[i] = encrypted[i] ^ key[i % key.length];
  }
  
  const decoder = new TextDecoder();
  const decryptedMessage = decoder.decode(decrypted);
  
  console.log('Decrypted message:', decryptedMessage);
  console.log('Match:', message === decryptedMessage);
  console.log('');
}

// Test base64 with encryption
function testBase64WithEncryption() {
  console.log('Testing base64 with encryption...');
  
  const message = 'Hello, World!';
  const key = crypto.randomBytes(32);
  
  // Encrypt
  const encoder = new TextEncoder();
  const messageBytes = encoder.encode(message);
  const encrypted = new Uint8Array(messageBytes.length);
  
  for (let i = 0; i < messageBytes.length; i++) {
    encrypted[i] = messageBytes[i] ^ key[i % key.length];
  }
  
  // Base64 encode encrypted data
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let encoded = '';
  let i = 0;
  
  while (i < encrypted.length) {
    const byte1 = encrypted[i++];
    const byte2 = i < encrypted.length ? encrypted[i++] : 0;
    const byte3 = i < encrypted.length ? encrypted[i++] : 0;
    
    const chunk1 = byte1 >> 2;
    const chunk2 = ((byte1 & 3) << 4) | (byte2 >> 4);
    const chunk3 = ((byte2 & 15) << 2) | (byte3 >> 6);
    const chunk4 = byte3 & 63;
    
    encoded += chars[chunk1] + chars[chunk2] + chars[chunk3] + chars[chunk4];
  }
  
  const padding = encrypted.length % 3;
  if (padding > 0) {
    encoded = encoded.slice(0, -padding) + '='.repeat(padding);
  }
  
  console.log('Encrypted base64:', encoded);
  
  // Decode base64
  const decodedBytes = [];
  const encodedClean = encoded.replace(/=/g, '');
  
  for (let i = 0; i < encodedClean.length; i += 4) {
    const chunk1 = chars.indexOf(encodedClean[i]);
    const chunk2 = chars.indexOf(encodedClean[i + 1]);
    const chunk3 = chars.indexOf(encodedClean[i + 2]);
    const chunk4 = chars.indexOf(encodedClean[i + 3]);
    
    if (chunk1 === -1 || chunk2 === -1) continue;
    
    const byte1 = (chunk1 << 2) | (chunk2 >> 4);
    decodedBytes.push(byte1);
    
    if (chunk3 !== -1) {
      const byte2 = ((chunk2 & 15) << 4) | (chunk3 >> 2);
      decodedBytes.push(byte2);
      
      if (chunk4 !== -1) {
        const byte3 = ((chunk3 & 3) << 6) | chunk4;
        decodedBytes.push(byte3);
      }
    }
  }
  
  const decodedEncrypted = new Uint8Array(decodedBytes);
  console.log('Decoded encrypted bytes:', Array.from(decodedEncrypted.slice(0, 10)));
  
  // Decrypt
  const decrypted = new Uint8Array(decodedEncrypted.length);
  for (let i = 0; i < decodedEncrypted.length; i++) {
    decrypted[i] = decodedEncrypted[i] ^ key[i % key.length];
  }
  
  const decoder = new TextDecoder();
  const finalMessage = decoder.decode(decrypted);
  
  console.log('Final decrypted message:', finalMessage);
  console.log('Match:', message === finalMessage);
}

console.log('🔐 Encryption Debug Test');
console.log('========================\n');

testBase64();
testEncryption();
testBase64WithEncryption();

console.log('✅ Debug test completed!'); 