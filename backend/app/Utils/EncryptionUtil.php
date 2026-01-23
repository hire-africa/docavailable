<?php

namespace App\Utils;

use Exception;

class EncryptionUtil
{
    private const CIPHER_ALGO = 'aes-256-gcm';
    private const TAG_LENGTH = 16;

    /**
     * Encrypt a plaintext message using AES-256-GCM
     * 
     * @param string $plaintext The message to encrypt
     * @return array Returns ['ciphertext' => string, 'iv' => string, 'tag' => string]
     * @throws Exception If encryption fails
     */
    public static function encryptMessage(string $plaintext): array
    {
        $key = self::getEncryptionKey();

        $ivLength = openssl_cipher_iv_length(self::CIPHER_ALGO);
        $iv = openssl_random_pseudo_bytes($ivLength);

        $tag = '';
        $ciphertext = openssl_encrypt(
            $plaintext,
            self::CIPHER_ALGO,
            $key,
            OPENSSL_RAW_DATA,
            $iv,
            $tag,
            '',
            self::TAG_LENGTH
        );

        if ($ciphertext === false) {
            throw new Exception('Encryption failed');
        }

        return [
            'ciphertext' => base64_encode($ciphertext),
            'iv' => base64_encode($iv),
            'tag' => base64_encode($tag)
        ];
    }

    /**
     * Decrypt a ciphertext message using AES-256-GCM
     * 
     * @param string $ciphertext The base64-encoded encrypted message
     * @param string $iv The base64-encoded initialization vector
     * @param string $tag The base64-encoded authentication tag
     * @return string The decrypted plaintext
     * @throws Exception If decryption fails
     */
    public static function decryptMessage(string $ciphertext, string $iv, string $tag): string
    {
        $key = self::getEncryptionKey();

        $ciphertextRaw = base64_decode($ciphertext);
        $ivRaw = base64_decode($iv);
        $tagRaw = base64_decode($tag);

        if ($ciphertextRaw === false || $ivRaw === false || $tagRaw === false) {
            throw new Exception('Invalid base64 encoding');
        }

        $plaintext = openssl_decrypt(
            $ciphertextRaw,
            self::CIPHER_ALGO,
            $key,
            OPENSSL_RAW_DATA,
            $ivRaw,
            $tagRaw
        );

        if ($plaintext === false) {
            throw new Exception('Decryption failed');
        }

        return $plaintext;
    }

    /**
     * Retrieve the encryption key from environment variable
     * 
     * @return string The encryption key
     * @throws Exception If key is not configured
     */
    private static function getEncryptionKey(): string
    {
        $key = env('CHAT_ENCRYPTION_KEY');

        if (empty($key)) {
            throw new Exception('Encryption key not configured');
        }

        if (strlen($key) !== 32) {
            throw new Exception('Encryption key must be exactly 32 bytes for AES-256');
        }

        return $key;
    }
}
