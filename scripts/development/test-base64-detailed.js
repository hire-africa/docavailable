// Detailed base64 test
const testString = 'Hello, World!';
console.log('Original:', testString);

// Encode to bytes
const encoder = new TextEncoder();
const bytes = encoder.encode(testString);
console.log('Bytes:', Array.from(bytes));
console.log('Length:', bytes.length);

// Base64 encode step by step
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
let encoded = '';
let i = 0;

console.log('\nEncoding step by step:');
while (i < bytes.length) {
  const byte1 = bytes[i++];
  const byte2 = i < bytes.length ? bytes[i++] : 0;
  const byte3 = i < bytes.length ? bytes[i++] : 0;
  
  console.log(`Processing: ${byte1}, ${byte2}, ${byte3}`);
  
  const chunk1 = byte1 >> 2;
  const chunk2 = ((byte1 & 3) << 4) | (byte2 >> 4);
  const chunk3 = ((byte2 & 15) << 2) | (byte3 >> 6);
  const chunk4 = byte3 & 63;
  
  console.log(`Chunks: ${chunk1}, ${chunk2}, ${chunk3}, ${chunk4}`);
  console.log(`Chars: ${chars[chunk1]}, ${chars[chunk2]}, ${chars[chunk3]}, ${chars[chunk4]}`);
  
  encoded += chars[chunk1] + chars[chunk2] + chars[chunk3] + chars[chunk4];
}

console.log('\nBefore padding:', encoded);

// Add padding correctly
const padding = (3 - (bytes.length % 3)) % 3;
console.log('Padding needed:', padding);
if (padding > 0) {
  encoded = encoded.slice(0, -padding) + '='.repeat(padding);
}

console.log('After padding:', encoded);

// Decode step by step
console.log('\nDecoding step by step:');
const decodedBytes = [];
let paddingCount = 0;
if (encoded.endsWith('==')) {
  paddingCount = 2;
  encoded = encoded.slice(0, -2);
} else if (encoded.endsWith('=')) {
  paddingCount = 1;
  encoded = encoded.slice(0, -1);
}

console.log('After removing padding:', encoded);
console.log('Padding removed:', paddingCount);

for (let i = 0; i < encoded.length; i += 4) {
  const chunk1 = chars.indexOf(encoded[i]);
  const chunk2 = chars.indexOf(encoded[i + 1]);
  const chunk3 = chars.indexOf(encoded[i + 2]);
  const chunk4 = chars.indexOf(encoded[i + 3]);
  
  console.log(`Decoding chunk: ${encoded[i]}${encoded[i+1]}${encoded[i+2]}${encoded[i+3]}`);
  console.log(`Chunk values: ${chunk1}, ${chunk2}, ${chunk3}, ${chunk4}`);
  
  if (chunk1 === -1 || chunk2 === -1) continue;
  
  const byte1 = (chunk1 << 2) | (chunk2 >> 4);
  decodedBytes.push(byte1);
  console.log(`Decoded byte1: ${byte1}`);
  
  if (chunk3 !== -1) {
    const byte2 = ((chunk2 & 15) << 4) | (chunk3 >> 2);
    decodedBytes.push(byte2);
    console.log(`Decoded byte2: ${byte2}`);
    
    if (chunk4 !== -1) {
      const byte3 = ((chunk3 & 3) << 6) | chunk4;
      decodedBytes.push(byte3);
      console.log(`Decoded byte3: ${byte3}`);
    }
  }
}

console.log('\nFinal decoded bytes:', decodedBytes);
console.log('Original bytes:', Array.from(bytes));
console.log('Bytes match:', JSON.stringify(decodedBytes) === JSON.stringify(Array.from(bytes)));

const decoder = new TextDecoder();
const decoded = decoder.decode(new Uint8Array(decodedBytes));
console.log('Decoded string:', decoded);
console.log('Match:', testString === decoded); 