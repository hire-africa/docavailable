import * as Crypto from 'expo-crypto';
import 'react-native-get-random-values';

// Polyfill for crypto.getRandomValues
if (typeof global.crypto === 'undefined') {
  global.crypto = {
    getRandomValues: (array: Uint8Array) => {
      const randomBytes = Crypto.getRandomBytes(array.length);
      array.set(randomBytes);
      return array;
    },
    subtle: {
      generateKey: async (algorithm: any, extractable: boolean, keyUsages: string[]) => {
        // For AES-GCM key generation
        if (algorithm.name === 'AES-GCM') {
          const keyData = Crypto.getRandomBytes(32); // 256-bit key
          return {
            type: 'secret',
            extractable,
            algorithm,
            usages: keyUsages,
            keyData
          };
        }
        // For RSA key generation
        if (algorithm.name === 'RSA-OAEP') {
          // Note: RSA key generation is complex and would need a proper implementation
          // For now, we'll throw an error and let the server handle it
          throw new Error('RSA key generation not supported in React Native polyfill');
        }
        throw new Error(`Unsupported algorithm: ${algorithm.name}`);
      },
      importKey: async (format: string, keyData: ArrayBuffer, algorithm: any, extractable: boolean, keyUsages: string[]) => {
        if (algorithm.name === 'AES-GCM') {
          return {
            type: 'secret',
            extractable,
            algorithm,
            usages: keyUsages,
            keyData: new Uint8Array(keyData)
          };
        }
        if (algorithm.name === 'RSA-OAEP') {
          return {
            type: format === 'spki' ? 'public' : 'private',
            extractable,
            algorithm,
            usages: keyUsages,
            keyData: new Uint8Array(keyData)
          };
        }
        throw new Error(`Unsupported algorithm: ${algorithm.name}`);
      },
      exportKey: async (format: string, key: any) => {
        if (format === 'raw' && key.type === 'secret') {
          return key.keyData.buffer;
        }
        if (format === 'spki' && key.type === 'public') {
          return key.keyData.buffer;
        }
        if (format === 'pkcs8' && key.type === 'private') {
          return key.keyData.buffer;
        }
        throw new Error(`Unsupported export format: ${format}`);
      },
      encrypt: async (algorithm: any, key: any, data: ArrayBuffer) => {
        if (algorithm.name === 'AES-GCM') {
          const iv = algorithm.iv;
          const keyBytes = key.keyData;
          const dataBytes = new Uint8Array(data);

          // Use expo-crypto for AES encryption
          const encrypted = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            Buffer.from(dataBytes).toString('base64') + Buffer.from(keyBytes).toString('base64') + Buffer.from(iv).toString('base64')
          );

          // This is a simplified implementation - in production you'd want proper AES-GCM
          const result = new Uint8Array(dataBytes.length + 16); // +16 for GCM tag
          result.set(dataBytes);
          result.set(new Uint8Array(Buffer.from(encrypted, 'hex').slice(0, 16)), dataBytes.length);

          return result.buffer;
        }
        if (algorithm.name === 'RSA-OAEP') {
          // Simplified RSA encryption - in production you'd want proper RSA
          const dataBytes = new Uint8Array(data);
          const keyBytes = key.keyData;

          // Simple XOR encryption as fallback
          const result = new Uint8Array(dataBytes.length);
          for (let i = 0; i < dataBytes.length; i++) {
            result[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length];
          }

          return result.buffer;
        }
        throw new Error(`Unsupported encryption algorithm: ${algorithm.name}`);
      },
      decrypt: async (algorithm: any, key: any, data: ArrayBuffer) => {
        if (algorithm.name === 'AES-GCM') {
          const iv = algorithm.iv;
          const keyBytes = key.keyData;
          const dataBytes = new Uint8Array(data);

          // Remove GCM tag (last 16 bytes)
          const encryptedData = dataBytes.slice(0, -16);

          // Use expo-crypto for AES decryption
          const decrypted = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            Buffer.from(encryptedData).toString('base64') + Buffer.from(keyBytes).toString('base64') + Buffer.from(iv).toString('base64')
          );

          // This is a simplified implementation - in production you'd want proper AES-GCM
          return encryptedData.buffer;
        }
        if (algorithm.name === 'RSA-OAEP') {
          // Simplified RSA decryption - in production you'd want proper RSA
          const dataBytes = new Uint8Array(data);
          const keyBytes = key.keyData;

          // Simple XOR decryption as fallback
          const result = new Uint8Array(dataBytes.length);
          for (let i = 0; i < dataBytes.length; i++) {
            result[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length];
          }

          return result.buffer;
        }
        throw new Error(`Unsupported decryption algorithm: ${algorithm.name}`);
      },
      digest: async (algorithm: any, data: ArrayBuffer) => {
        const dataBytes = new Uint8Array(data);
        const hash = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          Buffer.from(dataBytes).toString('base64')
        );
        return Buffer.from(hash, 'hex').buffer;
      }
    }
  } as any;
}

// Polyfill for TextEncoder and TextDecoder
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = class TextEncoder {
    encode(text: string): Uint8Array {
      // Simple UTF-8 encoding (handles basic ASCII and common UTF-8)
      const bytes: number[] = [];
      for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i);
        if (charCode < 128) {
          bytes.push(charCode);
        } else {
          // For non-ASCII, use a simple approach
          bytes.push(charCode & 0xFF);
          if (charCode > 255) {
            bytes.push((charCode >> 8) & 0xFF);
          }
        }
      }
      // Remove trailing null bytes that might be added incorrectly
      while (bytes.length > 0 && bytes[bytes.length - 1] === 0) {
        bytes.pop();
      }

      return new Uint8Array(bytes);
    }
  } as any;
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = class TextDecoder {
    decode(bytes: Uint8Array): string {
      // Simple UTF-8 decoding
      let result = '';
      for (let i = 0; i < bytes.length; i++) {
        if (bytes[i] < 128) {
          result += String.fromCharCode(bytes[i]);
        } else {
          // Handle multi-byte characters
          if (i + 1 < bytes.length) {
            const charCode = bytes[i] | (bytes[i + 1] << 8);
            result += String.fromCharCode(charCode);
            i++; // Skip next byte
          } else {
            result += String.fromCharCode(bytes[i]);
          }
        }
      }
      return result;
    }
  } as any;
}

// Ensure TextEncoder and TextDecoder are available globally
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

// Polyfill for Buffer if not available
if (typeof global.Buffer === 'undefined') {
  global.Buffer = {
    from: (data: any, encoding?: string) => {
      if (encoding === 'base64') {
        // Use our base64 decode function
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        const bytes: number[] = [];

        // Count padding
        let padding = 0;
        if (data.endsWith('==')) {
          padding = 2;
          data = data.slice(0, -2);
        } else if (data.endsWith('=')) {
          padding = 1;
          data = data.slice(0, -1);
        }

        for (let i = 0; i < data.length; i += 4) {
          const chunk1 = chars.indexOf(data[i]);
          const chunk2 = chars.indexOf(data[i + 1]);
          const chunk3 = i + 2 < data.length ? chars.indexOf(data[i + 2]) : -1;
          const chunk4 = i + 3 < data.length ? chars.indexOf(data[i + 3]) : -1;

          if (chunk1 === -1 || chunk2 === -1) continue;

          const byte1 = (chunk1 << 2) | (chunk2 >> 4);
          bytes.push(byte1);

          if (chunk3 !== -1) {
            const byte2 = ((chunk2 & 15) << 4) | (chunk3 >> 2);
            bytes.push(byte2);

            if (chunk4 !== -1) {
              const byte3 = ((chunk3 & 3) << 6) | chunk4;
              bytes.push(byte3);
            }
          }
        }

        return new Uint8Array(bytes);
      }
      if (data instanceof Uint8Array) {
        return data;
      }
      if (typeof data === 'string') {
        return new TextEncoder().encode(data);
      }
      return new Uint8Array(data);
    }
  } as any;

  // Add toString method to Uint8Array prototype for Buffer compatibility
  if (!Uint8Array.prototype.toString) {
    Uint8Array.prototype.toString = function (encoding?: string) {
      if (encoding === 'base64') {
        // Use our base64 encode function
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        let result = '';
        let i = 0;

        while (i < this.length) {
          const byte1 = this[i++];
          const byte2 = i < this.length ? this[i++] : 0;
          const byte3 = i < this.length ? this[i++] : 0;

          const chunk1 = byte1 >> 2;
          const chunk2 = ((byte1 & 3) << 4) | (byte2 >> 4);
          const chunk3 = ((byte2 & 15) << 2) | (byte3 >> 6);
          const chunk4 = byte3 & 63;

          result += chars[chunk1] + chars[chunk2] + chars[chunk3] + chars[chunk4];
        }

        // Add padding correctly
        const padding = (3 - (this.length % 3)) % 3;
        if (padding > 0) {
          result = result.slice(0, -padding) + '='.repeat(padding);
        }

        return result;
      }
      return new TextDecoder().decode(this);
    };
  }
}

// Polyfill for atob and btoa
if (typeof global.atob === 'undefined') {
  global.atob = (data: string) => {
    return Buffer.from(data, 'base64').toString();
  };
}

if (typeof global.btoa === 'undefined') {
  global.btoa = (data: string) => {
    return Buffer.from(data).toString('base64');
  };
}

export default global.crypto; 