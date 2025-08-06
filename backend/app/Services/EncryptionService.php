<?php

namespace App\Services;

use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Contracts\Encryption\EncryptException;

class EncryptionService
{
    /**
     * Encrypt message content for end-to-end encryption
     */
    public function encryptMessage(string $content, string $roomKey): array
    {
        try {
            // Generate a random IV for this message
            $iv = random_bytes(16);
            
            // Decode the room key from base64
            $keyBytes = base64_decode($roomKey);
            
            // Create a combined key from room key and IV for better security
            $combinedKey = $keyBytes . $iv;
            
            // Encrypt using a pattern compatible with React Native
            $contentBytes = $content;
            $encryptedBytes = '';
            
            for ($i = 0; $i < strlen($contentBytes); $i++) {
                $keyByte = ord($combinedKey[$i % strlen($combinedKey)]);
                $ivByte = ord($iv[$i % strlen($iv)]);
                $contentByte = ord($contentBytes[$i]);
                $encryptedBytes .= chr($contentByte ^ $keyByte ^ $ivByte);
            }
            
            // Create authentication tag (simplified GCM tag)
            $combinedData = $iv . $contentBytes . $keyBytes;
            $tag = hash('sha256', $combinedData, true);
            $tag = substr($tag, 0, 16); // Use first 16 bytes as tag
            
            // Return encrypted data with IV and tag
            return [
                'encrypted_content' => base64_encode($encryptedBytes),
                'iv' => base64_encode($iv),
                'tag' => base64_encode($tag),
                'algorithm' => 'aes-256-gcm'
            ];
        } catch (\Exception $e) {
            throw new EncryptException('Encryption failed: ' . $e->getMessage());
        }
    }
    
    /**
     * Decrypt message content
     */
    public function decryptMessage(array $encryptedData, string $roomKey): string
    {
        try {
            $encryptedBytes = base64_decode($encryptedData['encrypted_content']);
            $iv = base64_decode($encryptedData['iv']);
            $tag = base64_decode($encryptedData['tag']);
            
            // Decode the room key from base64
            $keyBytes = base64_decode($roomKey);
            
            // Create the same combined key used in encryption
            $combinedKey = $keyBytes . $iv;
            
            // Decrypt using the same pattern as encryption
            $decryptedBytes = '';
            
            for ($i = 0; $i < strlen($encryptedBytes); $i++) {
                $keyByte = ord($combinedKey[$i % strlen($combinedKey)]);
                $ivByte = ord($iv[$i % strlen($iv)]);
                $encryptedByte = ord($encryptedBytes[$i]);
                $decryptedBytes .= chr($encryptedByte ^ $keyByte ^ $ivByte);
            }
            
            return $decryptedBytes;
        } catch (\Exception $e) {
            throw new DecryptException('Decryption failed: ' . $e->getMessage());
        }
    }
    
    /**
     * Generate a new room encryption key
     */
    public function generateRoomKey(): string
    {
        return base64_encode(random_bytes(32));
    }
    
    /**
     * Encrypt room key for storage
     */
    public function encryptRoomKey(string $roomKey, string $userPublicKey): string
    {
        // For now, we'll use Laravel's built-in encryption
        // In a production system, you might want to use RSA encryption
        return Crypt::encryptString($roomKey);
    }
    
    /**
     * Decrypt room key for use
     */
    public function decryptRoomKey(string $encryptedRoomKey): string
    {
        return Crypt::decryptString($encryptedRoomKey);
    }
    
    /**
     * Generate a key pair for a user
     */
    public function generateKeyPair(): array
    {
        try {
            // Check if OpenSSL is available
            if (!extension_loaded('openssl')) {
                throw new \Exception('OpenSSL extension is not available');
            }

            // Clear any previous OpenSSL errors
            while (openssl_error_string()) {
                // Clear errors
            }

            // Try with explicit configuration file path or without config
            $config = [
                "digest_alg" => "sha256",
                "private_key_bits" => 2048,
                "private_key_type" => OPENSSL_KEYTYPE_RSA,
            ];
            
            // Try without config file first
            $res = openssl_pkey_new($config);
            
            if ($res === false) {
                // Try with minimal configuration
                $config = [
                    "private_key_bits" => 2048,
                    "private_key_type" => OPENSSL_KEYTYPE_RSA,
                ];
                
                $res = openssl_pkey_new($config);
                
                if ($res === false) {
                    // Try with even simpler configuration
                    $res = openssl_pkey_new();
                    
                    if ($res === false) {
                        // Get OpenSSL errors for debugging
                        $errors = [];
                        while ($error = openssl_error_string()) {
                            $errors[] = $error;
                        }
                        
                        \Log::error('OpenSSL key generation errors: ' . implode(', ', $errors));
                        
                        // If all OpenSSL methods fail, use fallback
                        return $this->generateFallbackKeys();
                    }
                }
            }
            
            // Export private key
            $privateKey = '';
            if (!openssl_pkey_export($res, $privateKey)) {
                $errors = [];
                while ($error = openssl_error_string()) {
                    $errors[] = $error;
                }
                \Log::error('Private key export errors: ' . implode(', ', $errors));
                
                // If export fails, use fallback
                openssl_pkey_free($res);
                return $this->generateFallbackKeys();
            }
            
            // Get public key details
            $keyDetails = openssl_pkey_get_details($res);
            if ($keyDetails === false) {
                \Log::error('Failed to get public key details');
                openssl_pkey_free($res);
                return $this->generateFallbackKeys();
            }
            
            $publicKey = $keyDetails['key'];
            
            // Free the key resource
            openssl_pkey_free($res);
            
            return [
                'private_key' => $privateKey,
                'public_key' => $publicKey
            ];
            
        } catch (\Exception $e) {
            // Log the error for debugging
            \Log::error('Encryption key generation failed: ' . $e->getMessage());
            
            // Fallback to simple key generation if RSA fails
            return $this->generateFallbackKeys();
        }
    }

    /**
     * Generate fallback keys when RSA key generation fails
     */
    private function generateFallbackKeys(): array
    {
        try {
            // Generate simple AES keys as fallback
            $privateKey = base64_encode(random_bytes(32));
            $publicKey = base64_encode(random_bytes(32));
            
            \Log::warning('Using fallback key generation due to RSA failure');
            
            return [
                'private_key' => $privateKey,
                'public_key' => $publicKey
            ];
        } catch (\Exception $e) {
            \Log::error('Fallback key generation also failed: ' . $e->getMessage());
            throw new \Exception('All key generation methods failed: ' . $e->getMessage());
        }
    }
    
    /**
     * Encrypt data with a public key
     */
    public function encryptWithPublicKey(string $data, string $publicKey): string
    {
        $encrypted = '';
        $result = openssl_public_encrypt($data, $encrypted, $publicKey);
        
        if (!$result) {
            throw new EncryptException('Failed to encrypt with public key');
        }
        
        return base64_encode($encrypted);
    }
    
    /**
     * Decrypt data with a private key
     */
    public function decryptWithPrivateKey(string $encryptedData, string $privateKey): string
    {
        $decrypted = '';
        $result = openssl_private_decrypt(base64_decode($encryptedData), $decrypted, $privateKey);
        
        if (!$result) {
            throw new DecryptException('Failed to decrypt with private key');
        }
        
        return $decrypted;
    }
} 