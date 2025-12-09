import * as Crypto from 'expo-crypto';
import 'react-native-get-random-values';

// Simplified crypto polyfill for better Metro bundling
if (typeof global.crypto === 'undefined') {
  global.crypto = {
    getRandomValues: (array: Uint8Array) => {
      const randomBytes = Crypto.getRandomBytes(array.length);
      array.set(randomBytes);
      return array;
    },
    subtle: {
      generateKey: async () => {
        throw new Error('Crypto operations not supported in React Native');
      },
      importKey: async () => {
        throw new Error('Crypto operations not supported in React Native');
      },
      exportKey: async () => {
        throw new Error('Crypto operations not supported in React Native');
      },
      encrypt: async () => {
        throw new Error('Crypto operations not supported in React Native');
      },
      decrypt: async () => {
        throw new Error('Crypto operations not supported in React Native');
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

// Simple TextEncoder/TextDecoder polyfills
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = class TextEncoder {
    encode(text: string): Uint8Array {
      return new Uint8Array(Buffer.from(text, 'utf8'));
    }
  } as any;
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = class TextDecoder {
    decode(bytes: Uint8Array): string {
      return Buffer.from(bytes).toString('utf8');
    }
  } as any;
}

// Simple Buffer polyfill
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}

export default global.crypto;

