import { Buffer } from 'buffer';

export interface EncryptedMessage {
  encrypted_content: string;
  iv: string;
  tag: string;
  algorithm: string;
}

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

class EncryptionService {
  private keyCache: Map<string, CryptoKey> = new Map();

  /**
   * Generate a random encryption key
   */
  async generateKey(): Promise<string> {
    const key = await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    );

    const exportedKey = await crypto.subtle.exportKey('raw', key);
    return Buffer.from(exportedKey).toString('base64');
  }

  /**
   * Import a key from base64 string
   */
  async importKey(keyString: string): Promise<CryptoKey> {
    if (this.keyCache.has(keyString)) {
      return this.keyCache.get(keyString)!;
    }

    const keyData = Buffer.from(keyString, 'base64');
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      {
        name: 'AES-GCM',
        length: 256,
      },
      false,
      ['encrypt', 'decrypt']
    );

    this.keyCache.set(keyString, key);
    return key;
  }

  /**
   * Encrypt a message
   */
  async encryptMessage(content: string, roomKey: string): Promise<EncryptedMessage> {
    try {
      const key = await this.importKey(roomKey);
      const encoder = new TextEncoder();
      const data = encoder.encode(content);

      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // Encrypt the data
      const encrypted = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        key,
        data
      );

      // Extract the tag (last 16 bytes)
      const encryptedArray = new Uint8Array(encrypted);
      const tag = encryptedArray.slice(-16);
      const encryptedContent = encryptedArray.slice(0, -16);

      return {
        encrypted_content: Buffer.from(encryptedContent).toString('base64'),
        iv: Buffer.from(iv).toString('base64'),
        tag: Buffer.from(tag).toString('base64'),
        algorithm: 'aes-256-gcm',
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt message');
    }
  }

  /**
   * Decrypt a message
   */
  async decryptMessage(encryptedData: EncryptedMessage, roomKey: string): Promise<string> {
    try {
      const key = await this.importKey(roomKey);
      
      const encryptedContent = Buffer.from(encryptedData.encrypted_content, 'base64');
      const iv = Buffer.from(encryptedData.iv, 'base64');
      const tag = Buffer.from(encryptedData.tag, 'base64');

      // Combine encrypted content and tag
      const combined = new Uint8Array(encryptedContent.length + tag.length);
      combined.set(encryptedContent);
      combined.set(tag, encryptedContent.length);

      // Decrypt
      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        key,
        combined
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt message');
    }
  }

  /**
   * Generate RSA key pair for user
   */
  async generateKeyPair(): Promise<KeyPair> {
    try {
      const keyPair = await crypto.subtle.generateKey(
        {
          name: 'RSA-OAEP',
          modulusLength: 4096,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256',
        },
        true,
        ['encrypt', 'decrypt']
      );

      // Export public key
      const publicKeyBuffer = await crypto.subtle.exportKey('spki', keyPair.publicKey);
      const publicKey = Buffer.from(publicKeyBuffer).toString('base64');

      // Export private key
      const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
      const privateKey = Buffer.from(privateKeyBuffer).toString('base64');

      return {
        publicKey,
        privateKey,
      };
    } catch (error) {
      console.error('Key pair generation error:', error);
      throw new Error('Failed to generate key pair');
    }
  }

  /**
   * Encrypt data with a public key
   */
  async encryptWithPublicKey(data: string, publicKeyString: string): Promise<string> {
    try {
      const publicKeyBuffer = Buffer.from(publicKeyString, 'base64');
      const publicKey = await crypto.subtle.importKey(
        'spki',
        publicKeyBuffer,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256',
        },
        false,
        ['encrypt']
      );

      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);

      const encrypted = await crypto.subtle.encrypt(
        {
          name: 'RSA-OAEP',
        },
        publicKey,
        dataBuffer
      );

      return Buffer.from(encrypted).toString('base64');
    } catch (error) {
      console.error('Public key encryption error:', error);
      throw new Error('Failed to encrypt with public key');
    }
  }

  /**
   * Decrypt data with a private key
   */
  async decryptWithPrivateKey(encryptedData: string, privateKeyString: string): Promise<string> {
    try {
      const privateKeyBuffer = Buffer.from(privateKeyString, 'base64');
      const privateKey = await crypto.subtle.importKey(
        'pkcs8',
        privateKeyBuffer,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256',
        },
        false,
        ['decrypt']
      );

      const encryptedBuffer = Buffer.from(encryptedData, 'base64');

      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'RSA-OAEP',
        },
        privateKey,
        encryptedBuffer
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Private key decryption error:', error);
      throw new Error('Failed to decrypt with private key');
    }
  }

  /**
   * Hash a string using SHA-256
   */
  async hashString(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Buffer.from(hashBuffer).toString('base64');
  }

  /**
   * Generate a random string
   */
  generateRandomString(length: number = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Buffer.from(array).toString('base64');
  }

  /**
   * Clear the key cache
   */
  clearCache(): void {
    this.keyCache.clear();
  }
}

export default new EncryptionService(); 