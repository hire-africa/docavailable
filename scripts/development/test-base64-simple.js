// Simple base64 test
const testString = 'Hello, World!';
console.log('Original:', testString);

// Encode to bytes
const encoder = new TextEncoder();
const bytes = encoder.encode(testString);
console.log('Bytes:', Array.from(bytes));

// Base64 encode
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

// Add padding correctly
const paddingCount = (3 - (bytes.length % 3)) % 3;
if (paddingCount > 0) {
  encoded = encoded.slice(0, -paddingCount) + '='.repeat(paddingCount);
}

console.log('Encoded:', encoded);

// Decode
const decodedBytes = [];
let padding = 0;
if (encoded.endsWith('==')) {
  padding = 2;
  encoded = encoded.slice(0, -2);
} else if (encoded.endsWith('=')) {
  padding = 1;
  encoded = encoded.slice(0, -1);
}

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

// Don't remove bytes based on padding - the padding is already handled by the base64 algorithm

console.log('Decoded bytes:', decodedBytes);
console.log('Original bytes:', Array.from(bytes));
console.log('Bytes match:', JSON.stringify(decodedBytes) === JSON.stringify(Array.from(bytes)));

const decoder = new TextDecoder();
const decoded = decoder.decode(new Uint8Array(decodedBytes));
console.log('Decoded:', decoded);
console.log('Match:', testString === decoded); 