<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use App\Utils\EncryptionUtil;

class MessageStorageService
{
    private const CACHE_PREFIX = 'chat_messages_';
    private const CACHE_TTL = 3600; // 1 hour cache
    private const MAX_MESSAGES_PER_ROOM = 1000; // Limit messages per room

    /**
     * Store a message in server cache
     */
    public function storeMessage(int $appointmentId, array $messageData, string $sessionType = 'appointment'): array
    {
        try {
            $cacheKey = $this->getCacheKey($appointmentId, $sessionType);

            // Get existing messages
            $messages = $this->getMessages($appointmentId, $sessionType);

            // Check for duplicate messages by temp_id or content
            $isDuplicate = false;
            $existingMessage = null;

            foreach ($messages as $existingMsg) {
                // Check by message ID first (most reliable)
                if (
                    !empty($messageData['id']) && !empty($existingMsg['id']) &&
                    $existingMsg['id'] === $messageData['id']
                ) {
                    $isDuplicate = true;
                    $existingMessage = $existingMsg;
                    break;
                }

                // Check by temp_id second
                if (
                    !empty($messageData['temp_id']) && !empty($existingMsg['temp_id']) &&
                    $existingMsg['temp_id'] === $messageData['temp_id']
                ) {
                    $isDuplicate = true;
                    $existingMessage = $existingMsg;
                    break;
                }

                // Check by content and sender within last 30 seconds (prevent rapid duplicates)
                // For voice and image messages, also check media_url since they all have the same message text
                if (
                    $existingMsg['sender_id'] === $messageData['sender_id'] &&
                    $existingMsg['message'] === $messageData['message'] &&
                    $existingMsg['message_type'] === ($messageData['message_type'] ?? 'text')
                ) {

                    // For voice and image messages, also check if media_url is the same
                    if (($messageData['message_type'] ?? 'text') === 'voice' || ($messageData['message_type'] ?? 'text') === 'image') {
                        $existingMediaUrl = $existingMsg['media_url'] ?? '';
                        $newMediaUrl = $messageData['media_url'] ?? '';

                        // If media URLs are different, it's not a duplicate
                        if ($existingMediaUrl !== $newMediaUrl) {
                            continue; // Skip this check, not a duplicate
                        }

                        // Additional check: if temp_id contains identifiers, check those too
                        if (!empty($messageData['temp_id']) && !empty($existingMsg['temp_id'])) {
                            $newTempId = $messageData['temp_id'];
                            $existingTempId = $existingMsg['temp_id'];

                            // If temp_ids are different, it's not a duplicate
                            if ($newTempId !== $existingTempId) {
                                continue; // Skip this check, not a duplicate
                            }
                        }
                    }

                    $existingTime = \Carbon\Carbon::parse($existingMsg['created_at']);
                    $currentTime = now();

                    // Different time windows for different message types
                    $timeWindow = 30; // Default 30 seconds for text messages
                    if (($messageData['message_type'] ?? 'text') === 'voice') {
                        $timeWindow = 60; // 60 seconds for voice messages
                    } else if (($messageData['message_type'] ?? 'text') === 'image') {
                        $timeWindow = 45; // 45 seconds for image messages
                    }

                    if ($currentTime->diffInSeconds($existingTime) < $timeWindow) {
                        $isDuplicate = true;
                        $existingMessage = $existingMsg;
                        break;
                    }
                }
            }

            if ($isDuplicate) {
                Log::info("Duplicate message detected, returning existing message", [
                    'appointment_id' => $appointmentId,
                    'existing_message_id' => $existingMessage['id'],
                    'temp_id' => $messageData['temp_id'] ?? 'none',
                    'message_type' => $messageData['message_type'] ?? 'text',
                    'media_url' => $messageData['media_url'] ?? 'none'
                ]);
                return $existingMessage;
            }

            // Add new message with unique ID (use provided ID if available)
            $messageId = $messageData['id'] ?? Str::uuid()->toString();

            // Encrypt message content before storage
            $encryptedData = null;
            $plaintextMessage = $messageData['message'];

            try {
                $encryptedData = EncryptionUtil::encryptMessage($plaintextMessage);
                Log::info("Message encrypted successfully", [
                    'appointment_id' => $appointmentId,
                    'message_id' => $messageId
                ]);
            } catch (\Exception $e) {
                Log::error("Failed to encrypt message - falling back to cache-only storage", [
                    'appointment_id' => $appointmentId,
                    'message_id' => $messageId,
                    'error' => $e->getMessage()
                ]);
                // Continue with cache-only storage (existing behavior)
            }

            // Prepare message array for response (plaintext for API compatibility)
            $message = [
                'id' => $messageId,
                'appointment_id' => $appointmentId,
                'sender_id' => $messageData['sender_id'],
                'sender_name' => $messageData['sender_name'],
                'message' => $plaintextMessage,
                'message_type' => $messageData['message_type'] ?? 'text',
                'media_url' => $messageData['media_url'] ?? null,
                'timestamp' => now()->toISOString(),
                'created_at' => now()->toISOString(),
                'updated_at' => now()->toISOString()
            ];

            Log::info("Creating new message", [
                'appointment_id' => $appointmentId,
                'message_id' => $messageId,
                'temp_id' => $messageData['temp_id'] ?? 'none',
                'message_type' => $message['message_type'],
                'media_url' => $message['media_url'] ?? 'none',
                'media_url_length' => strlen($message['media_url'] ?? ''),
                'media_url_starts_with' => substr($message['media_url'] ?? '', 0, 50),
                'encrypted' => $encryptedData !== null
            ]);

            // Include temp_id in response if provided by client
            if (!empty($messageData['temp_id'])) {
                $message['temp_id'] = $messageData['temp_id'];
            }

            // MANDATORY: Encrypted message content before storage
            if ($encryptedData === null) {
                Log::error("CRITICAL: Message encryption failed - aborting message storage", [
                    'appointment_id' => $appointmentId,
                    'message_id' => $messageId
                ]);
                throw new \Exception("Message encryption failed. Message not stored.");
            }

            // Determine receiver_id from appointment context
            // For now, we'll use a placeholder - this should be derived from appointment/session data
            $receiverId = $messageData['receiver_id'] ?? 0;

            try {
                DB::table('chats')->insert([
                    'sender_id' => $messageData['sender_id'],
                    'receiver_id' => $receiverId,
                    'encrypted_content' => $encryptedData['ciphertext'],
                    'encryption_iv' => $encryptedData['iv'],
                    'encryption_tag' => $encryptedData['tag'],
                    'encryption_key_id' => 'default', // Can be enhanced for key rotation
                    'origin_platform' => $messageData['origin_platform'] ?? 'mobile',
                    'client_instance_id' => $messageData['client_instance_id'] ?? null,
                    'browser_metadata' => isset($messageData['browser_metadata'])
                        ? json_encode($messageData['browser_metadata'])
                        : null,
                    'created_at' => now()
                ]);

                Log::info("Message stored in database with encryption", [
                    'appointment_id' => $appointmentId,
                    'message_id' => $messageId
                ]);
            } catch (\Exception $e) {
                Log::error("CRITICAL: Failed to store encrypted message in database", [
                    'appointment_id' => $appointmentId,
                    'message_id' => $messageId,
                    'error' => $e->getMessage()
                ]);
                // MANDATORY: Fail the request if DB storage fails
                throw new \Exception("Database storage failed: " . $e->getMessage());
            }

            // Add to messages array for cache
            $messages[] = $message;

            // Limit messages to prevent memory issues
            if (count($messages) > self::MAX_MESSAGES_PER_ROOM) {
                $messages = array_slice($messages, -self::MAX_MESSAGES_PER_ROOM);
            }

            // Store in cache
            Cache::put($cacheKey, $messages, self::CACHE_TTL);

            Log::info("Message stored in cache", [
                'appointment_id' => $appointmentId,
                'message_id' => $messageId,
                'sender_id' => $messageData['sender_id'],
                'message_type' => $message['message_type'],
                'total_messages' => count($messages)
            ]);

            return $message;

        } catch (\Exception $e) {
            Log::error("Failed to store message", [
                'appointment_id' => $appointmentId,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Get messages for an appointment from server cache
     */
    public function getMessages(int $appointmentId, string $sessionType = 'appointment'): array
    {
        try {
            $cacheKey = $this->getCacheKey($appointmentId, $sessionType);
            $messages = Cache::get($cacheKey, []);

            // Debug: Log media URLs in retrieved messages
            $mediaMessages = array_filter($messages, function ($msg) {
                return !empty($msg['media_url']) && $msg['media_url'] !== 'none';
            });

            if (!empty($mediaMessages)) {
                Log::info("Media messages found in cache", [
                    'appointment_id' => $appointmentId,
                    'media_message_count' => count($mediaMessages),
                    'sample_media_urls' => array_map(function ($msg) {
                        return [
                            'id' => $msg['id'],
                            'type' => $msg['message_type'],
                            'media_url' => substr($msg['media_url'], 0, 100) . '...',
                            'media_url_length' => strlen($msg['media_url'])
                        ];
                    }, array_slice($mediaMessages, 0, 3))
                ]);
            }

            Log::info("Messages retrieved from cache", [
                'appointment_id' => $appointmentId,
                'message_count' => count($messages)
            ]);

            return $messages;

        } catch (\Exception $e) {
            Log::error("Failed to get messages", [
                'appointment_id' => $appointmentId,
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }



    /**
     * Sync messages from local storage to server
     */
    public function syncFromLocalStorage(int $appointmentId, array $localMessages, string $sessionType = 'appointment'): array
    {
        try {
            $serverMessages = $this->getMessages($appointmentId, $sessionType);
            $syncedCount = 0;
            $errors = [];

            foreach ($localMessages as $localMessage) {
                // Check if message already exists on server by both id and temp_id
                $exists = false;
                $serverIndex = null;

                foreach ($serverMessages as $index => $serverMessage) {
                    // First check by temp_id (for messages that were just sent)
                    if (
                        isset($localMessage['temp_id']) && isset($serverMessage['temp_id']) &&
                        $serverMessage['temp_id'] === $localMessage['temp_id']
                    ) {
                        $exists = true;
                        $serverIndex = $index;
                        break;
                    }

                    // Then check by id
                    if ($serverMessage['id'] === $localMessage['id']) {
                        $exists = true;
                        $serverIndex = $index;
                        break;
                    }
                }

                if (!$exists) {
                    // Add new message to server
                    $serverMessages[] = $localMessage;
                    $syncedCount++;
                    Log::info("Added new message to server", [
                        'appointment_id' => $appointmentId,
                        'message_id' => $localMessage['id'] ?? 'unknown',
                        'temp_id' => $localMessage['temp_id'] ?? 'none'
                    ]);
                } else {
                    // Update existing message with local data (including reactions)
                    $serverMessage = $serverMessages[$serverIndex];
                    $serverMessages[$serverIndex] = $this->mergeMessageData($serverMessage, $localMessage);
                    Log::info("Updated existing message on server", [
                        'appointment_id' => $appointmentId,
                        'message_id' => $localMessage['id'] ?? 'unknown',
                        'temp_id' => $localMessage['temp_id'] ?? 'none'
                    ]);
                }
            }

            // Limit messages
            if (count($serverMessages) > self::MAX_MESSAGES_PER_ROOM) {
                $serverMessages = array_slice($serverMessages, -self::MAX_MESSAGES_PER_ROOM);
            }

            // Store updated messages
            $cacheKey = $this->getCacheKey($appointmentId, $sessionType);
            Cache::put($cacheKey, $serverMessages, self::CACHE_TTL);

            Log::info("Messages synced from local storage", [
                'appointment_id' => $appointmentId,
                'synced_count' => $syncedCount,
                'total_messages' => count($serverMessages)
            ]);

            return [
                'synced_count' => $syncedCount,
                'total_messages' => count($serverMessages),
                'errors' => $errors
            ];

        } catch (\Exception $e) {
            Log::error("Error syncing messages from local storage", [
                'appointment_id' => $appointmentId,
                'error' => $e->getMessage()
            ]);

            return [
                'synced_count' => 0,
                'total_messages' => 0,
                'errors' => [$e->getMessage()]
            ];
        }
    }

    /**
     * Merge server message data with local message data
     */
    private function mergeMessageData(array $serverMessage, array $localMessage): array
    {
        // Merge reactions
        $mergedReactions = $this->mergeReactions(
            $serverMessage['reactions'] ?? [],
            $localMessage['reactions'] ?? []
        );

        // Merge read receipts
        $mergedReadBy = $this->mergeReadBy(
            $serverMessage['read_by'] ?? [],
            $localMessage['read_by'] ?? []
        );

        // STRONG PROTECTION: Never allow delivery status downgrades
        $deliveryStatus = $serverMessage['delivery_status'] ?? 'sent';
        if (isset($localMessage['delivery_status']) && isset($serverMessage['delivery_status'])) {
            $localPriority = $this->getDeliveryStatusPriority($localMessage['delivery_status']);
            $serverPriority = $this->getDeliveryStatusPriority($serverMessage['delivery_status']);

            Log::info("Comparing delivery status", [
                'local_status' => $localMessage['delivery_status'],
                'local_priority' => $localPriority,
                'server_status' => $serverMessage['delivery_status'],
                'server_priority' => $serverPriority,
                'message_id' => $serverMessage['id'] ?? 'unknown'
            ]);

            // ALWAYS preserve local status if it's higher or equal
            if ($localPriority >= $serverPriority) {
                $deliveryStatus = $localMessage['delivery_status'];
                Log::info("PROTECTED: Preserved local delivery status", [
                    'local_status' => $localMessage['delivery_status'],
                    'server_status' => $serverMessage['delivery_status'],
                    'message_id' => $serverMessage['id'] ?? 'unknown'
                ]);
            } else {
                // This should never happen, but log it as a warning
                Log::warning("WARNING: Server tried to downgrade delivery status - BLOCKED", [
                    'local_status' => $localMessage['delivery_status'],
                    'server_status' => $serverMessage['delivery_status'],
                    'message_id' => $serverMessage['id'] ?? 'unknown'
                ]);
                $deliveryStatus = $localMessage['delivery_status'];
            }
        } else if (isset($localMessage['delivery_status']) && !isset($serverMessage['delivery_status'])) {
            // If server doesn't have delivery status but local does, preserve local
            $deliveryStatus = $localMessage['delivery_status'];
            Log::info("PROTECTED: Preserved local delivery status when server had none", [
                'local_status' => $localMessage['delivery_status'],
                'message_id' => $serverMessage['id'] ?? 'unknown'
            ]);
        }

        // Handle temp_id: if server has a real ID, remove temp_id
        $mergedMessage = array_merge($serverMessage, $localMessage, [
            'reactions' => $mergedReactions,
            'read_by' => $mergedReadBy,
            'delivery_status' => $deliveryStatus,
            'updated_at' => now()->toISOString()
        ]);

        // If server has a real ID (not temp), remove temp_id
        if (isset($serverMessage['id']) && !str_starts_with($serverMessage['id'], 'msg_')) {
            unset($mergedMessage['temp_id']);
        }

        return $mergedMessage;
    }

    /**
     * Merge reactions from server and local, avoiding duplicates
     */
    private function mergeReactions(array $serverReactions, array $localReactions): array
    {
        $merged = $serverReactions;

        foreach ($localReactions as $localReaction) {
            // Check if this reaction already exists
            $exists = false;
            foreach ($merged as $existingReaction) {
                if (
                    $existingReaction['user_id'] === $localReaction['user_id'] &&
                    $existingReaction['reaction'] === $localReaction['reaction']
                ) {
                    $exists = true;
                    break;
                }
            }

            if (!$exists) {
                $merged[] = $localReaction;
            }
        }

        return $merged;
    }

    /**
     * Merge read receipts from server and local, avoiding duplicates
     */
    private function mergeReadBy(array $serverReadBy, array $localReadBy): array
    {
        $merged = $serverReadBy;

        foreach ($localReadBy as $localRead) {
            // Check if this read receipt already exists
            $exists = false;
            foreach ($merged as $existingRead) {
                if ($existingRead['user_id'] === $localRead['user_id']) {
                    $exists = true;
                    break;
                }
            }

            if (!$exists) {
                $merged[] = $localRead;
            }
        }

        return $merged;
    }

    /**
     * Add a reaction to a message
     */
    public function addReaction(int $appointmentId, string $messageId, int $userId, string $reaction, string $sessionType = 'appointment'): array
    {
        try {
            $cacheKey = $this->getCacheKey($appointmentId, $sessionType);
            $messages = $this->getMessages($appointmentId, $sessionType);

            // Find the message
            $messageIndex = null;
            foreach ($messages as $index => $message) {
                if ($message['id'] === $messageId) {
                    $messageIndex = $index;
                    break;
                }
            }

            if ($messageIndex === null) {
                // Message not found in server cache - this is normal for new messages
                // The reaction will be synced when the message is synced
                Log::info("Message not found in server cache for reaction - will sync later", [
                    'appointment_id' => $appointmentId,
                    'message_id' => $messageId,
                    'user_id' => $userId,
                    'reaction' => $reaction
                ]);

                return [
                    'success' => false,
                    'message' => 'Message not found in server cache - will sync when message is available',
                    'should_retry' => true
                ];
            }

            // Initialize reactions array if it doesn't exist
            if (!isset($messages[$messageIndex]['reactions'])) {
                $messages[$messageIndex]['reactions'] = [];
            }

            // Check if user already reacted with this emoji
            foreach ($messages[$messageIndex]['reactions'] as $existingReaction) {
                if ($existingReaction['user_id'] === $userId && $existingReaction['reaction'] === $reaction) {
                    return [
                        'success' => false,
                        'message' => 'User already reacted with this emoji'
                    ];
                }
            }

            // Add new reaction
            $newReaction = [
                'reaction' => $reaction,
                'user_id' => $userId,
                'user_name' => $this->getUserName($userId),
                'timestamp' => now()->toISOString()
            ];

            $messages[$messageIndex]['reactions'][] = $newReaction;

            // Store updated messages
            Cache::put($cacheKey, $messages, self::CACHE_TTL);

            Log::info("Reaction added to message", [
                'appointment_id' => $appointmentId,
                'message_id' => $messageId,
                'user_id' => $userId,
                'reaction' => $reaction
            ]);

            return [
                'success' => true,
                'message' => 'Reaction added successfully',
                'reaction' => $newReaction
            ];

        } catch (\Exception $e) {
            Log::error("Error adding reaction", [
                'appointment_id' => $appointmentId,
                'message_id' => $messageId,
                'user_id' => $userId,
                'reaction' => $reaction,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Remove a reaction from a message
     */
    public function removeReaction(int $appointmentId, string $messageId, int $userId, string $reaction, string $sessionType = 'appointment'): array
    {
        try {
            $cacheKey = $this->getCacheKey($appointmentId, $sessionType);
            $messages = $this->getMessages($appointmentId, $sessionType);

            // Find the message
            $messageIndex = null;
            foreach ($messages as $index => $message) {
                if ($message['id'] === $messageId) {
                    $messageIndex = $index;
                    break;
                }
            }

            if ($messageIndex === null) {
                throw new \Exception('Message not found');
            }

            // Remove the specific reaction
            if (isset($messages[$messageIndex]['reactions'])) {
                $messages[$messageIndex]['reactions'] = array_filter(
                    $messages[$messageIndex]['reactions'],
                    function ($existingReaction) use ($userId, $reaction) {
                        return !($existingReaction['user_id'] === $userId && $existingReaction['reaction'] === $reaction);
                    }
                );
            }

            // Store updated messages
            Cache::put($cacheKey, $messages, self::CACHE_TTL);

            Log::info("Reaction removed from message", [
                'appointment_id' => $appointmentId,
                'message_id' => $messageId,
                'user_id' => $userId,
                'reaction' => $reaction
            ]);

            return [
                'success' => true,
                'message' => 'Reaction removed successfully'
            ];

        } catch (\Exception $e) {
            Log::error("Error removing reaction", [
                'appointment_id' => $appointmentId,
                'message_id' => $messageId,
                'user_id' => $userId,
                'reaction' => $reaction,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Mark messages as read for an appointment
     */
    public function markMessagesAsRead(int $appointmentId, int $userId, string $timestamp, string $sessionType = 'appointment'): array
    {
        try {
            $cacheKey = $this->getCacheKey($appointmentId, $sessionType);
            $messages = $this->getMessages($appointmentId, $sessionType);
            $markedCount = 0;

            // If no messages, return early
            if (empty($messages)) {
                return [
                    'success' => true,
                    'message' => 'No messages to mark as read',
                    'marked_count' => 0
                ];
            }

            foreach ($messages as $index => $message) {
                // Only mark messages from other users as read
                if ($message['sender_id'] !== $userId) {
                    // Initialize read_by array if it doesn't exist
                    if (!isset($messages[$index]['read_by'])) {
                        $messages[$index]['read_by'] = [];
                    }

                    // Check if user already marked this message as read
                    $alreadyRead = false;
                    if (is_array($messages[$index]['read_by'])) {
                        foreach ($messages[$index]['read_by'] as $readEntry) {
                            if (isset($readEntry['user_id']) && $readEntry['user_id'] === $userId) {
                                $alreadyRead = true;
                                break;
                            }
                        }
                    }

                    if (!$alreadyRead) {
                        // Add read entry
                        $messages[$index]['read_by'][] = [
                            'user_id' => $userId,
                            'user_name' => $this->getUserName($userId),
                            'read_at' => $timestamp
                        ];

                        // Update delivery status to 'read' for messages that are now read
                        // Check if this message should be marked as read (messages from other users)
                        if ($messages[$index]['sender_id'] === $userId) {
                            Log::info("Skipping own message for read status update", [
                                'message_id' => $messages[$index]['id'] ?? 'unknown',
                                'user_id' => $userId
                            ]);
                        } else {
                            // If message has read_by entries but delivery_status is not 'read', update it
                            if (
                                isset($messages[$index]['read_by']) && is_array($messages[$index]['read_by']) &&
                                count($messages[$index]['read_by']) > 0 &&
                                (!isset($messages[$index]['delivery_status']) || $messages[$index]['delivery_status'] !== 'read')
                            ) {
                                $messages[$index]['delivery_status'] = 'read';
                                Log::info("Updated delivery status to 'read' for message", [
                                    'message_id' => $messages[$index]['id'] ?? 'unknown',
                                    'user_id' => $userId,
                                    'read_by_count' => count($messages[$index]['read_by'])
                                ]);
                            } else if (isset($messages[$index]['delivery_status']) && $messages[$index]['delivery_status'] === 'read') {
                                Log::info("Message already marked as read", [
                                    'message_id' => $messages[$index]['id'] ?? 'unknown',
                                    'user_id' => $userId
                                ]);
                            } else if (!isset($messages[$index]['delivery_status'])) {
                                // If no delivery status, set it to 'read' since it has read entries
                                $messages[$index]['delivery_status'] = 'read';
                                Log::info("Set delivery status to 'read' for message (no previous status)", [
                                    'message_id' => $messages[$index]['id'] ?? 'unknown',
                                    'user_id' => $userId
                                ]);
                            } else {
                                Log::info("Message not eligible for read status update", [
                                    'message_id' => $messages[$index]['id'] ?? 'unknown',
                                    'user_id' => $userId,
                                    'delivery_status' => $messages[$index]['delivery_status'] ?? 'none',
                                    'read_by_count' => isset($messages[$index]['read_by']) ? count($messages[$index]['read_by']) : 0
                                ]);
                            }
                        }

                        $markedCount++;
                    }
                }
            }

            // Store updated messages
            Cache::put($cacheKey, $messages, self::CACHE_TTL);

            Log::info("Messages marked as read", [
                'appointment_id' => $appointmentId,
                'user_id' => $userId,
                'marked_count' => $markedCount
            ]);

            return [
                'success' => true,
                'message' => 'Messages marked as read successfully',
                'marked_count' => $markedCount
            ];

        } catch (\Exception $e) {
            Log::error("Error marking messages as read", [
                'appointment_id' => $appointmentId,
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Force fix delivery status for messages with read entries
     */
    public function fixDeliveryStatus(int $appointmentId, string $sessionType = 'appointment'): array
    {
        try {
            $cacheKey = $this->getCacheKey($appointmentId, $sessionType);
            $messages = $this->getMessages($appointmentId, $sessionType);
            $fixedCount = 0;

            // If no messages, return early
            if (empty($messages)) {
                return [
                    'success' => true,
                    'message' => 'No messages to fix',
                    'fixed_count' => 0
                ];
            }

            foreach ($messages as $index => $message) {
                // Check if message has read_by entries but delivery_status is not 'read'
                if (
                    isset($message['read_by']) && is_array($message['read_by']) &&
                    count($message['read_by']) > 0 &&
                    (!isset($message['delivery_status']) || $message['delivery_status'] === null || $message['delivery_status'] !== 'read')
                ) {

                    $messages[$index]['delivery_status'] = 'read';
                    $fixedCount++;

                    Log::info("Fixed delivery status for message", [
                        'message_id' => $message['id'] ?? 'unknown',
                        'read_by_count' => count($message['read_by']),
                        'old_status' => $message['delivery_status'] ?? 'null',
                        'new_status' => 'read'
                    ]);
                }
            }

            // Store updated messages
            Cache::put($cacheKey, $messages, self::CACHE_TTL);

            Log::info("Fixed delivery status for messages", [
                'appointment_id' => $appointmentId,
                'fixed_count' => $fixedCount
            ]);

            return [
                'success' => true,
                'message' => 'Delivery status fixed successfully',
                'fixed_count' => $fixedCount
            ];

        } catch (\Exception $e) {
            Log::error("Error fixing delivery status", [
                'appointment_id' => $appointmentId,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Start typing indicator for a user
     */
    public function startTyping(int $appointmentId, int $userId, string $userName): array
    {
        try {
            $typingKey = "typing_{$appointmentId}";
            $typingUsers = Cache::get($typingKey, []);

            // Add or update typing user
            $typingUsers[$userId] = [
                'user_id' => $userId,
                'user_name' => $userName,
                'started_at' => now()->toISOString()
            ];

            // Store typing status (expires in 30 seconds)
            Cache::put($typingKey, $typingUsers, 30);

            Log::info("User started typing", [
                'appointment_id' => $appointmentId,
                'user_id' => $userId,
                'user_name' => $userName
            ]);

            return [
                'success' => true,
                'message' => 'Typing indicator started',
                'typing_users' => array_values($typingUsers)
            ];

        } catch (\Exception $e) {
            Log::error("Error starting typing indicator", [
                'appointment_id' => $appointmentId,
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Stop typing indicator for a user
     */
    public function stopTyping(int $appointmentId, int $userId): array
    {
        try {
            $typingKey = "typing_{$appointmentId}";
            $typingUsers = Cache::get($typingKey, []);

            // Remove user from typing list
            if (isset($typingUsers[$userId])) {
                unset($typingUsers[$userId]);

                // Update cache
                if (empty($typingUsers)) {
                    Cache::forget($typingKey);
                } else {
                    Cache::put($typingKey, $typingUsers, 30);
                }

                Log::info("User stopped typing", [
                    'appointment_id' => $appointmentId,
                    'user_id' => $userId
                ]);
            }

            return [
                'success' => true,
                'message' => 'Typing indicator stopped',
                'typing_users' => array_values($typingUsers)
            ];

        } catch (\Exception $e) {
            Log::error("Error stopping typing indicator", [
                'appointment_id' => $appointmentId,
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Get typing indicators for an appointment
     */
    public function getTypingUsers(int $appointmentId): array
    {
        try {
            $typingKey = "typing_{$appointmentId}";
            $typingUsers = Cache::get($typingKey, []);

            // Clean up expired typing indicators
            $currentTime = now();
            $validUsers = [];

            foreach ($typingUsers as $userId => $userData) {
                $startedAt = \Carbon\Carbon::parse($userData['started_at']);
                if ($currentTime->diffInSeconds($startedAt) < 30) {
                    $validUsers[$userId] = $userData;
                }
            }

            // Update cache with only valid users
            if (count($validUsers) !== count($typingUsers)) {
                if (empty($validUsers)) {
                    Cache::forget($typingKey);
                } else {
                    Cache::put($typingKey, $validUsers, 30);
                }
            }

            return array_values($validUsers);

        } catch (\Exception $e) {
            Log::error("Error getting typing users", [
                'appointment_id' => $appointmentId,
                'error' => $e->getMessage()
            ]);

            return [];
        }
    }

    /**
     * Get a specific message by ID
     */
    public function getMessage(int $appointmentId, string $messageId, string $sessionType = 'appointment'): ?array
    {
        try {
            $messages = $this->getMessages($appointmentId, $sessionType);
            foreach ($messages as $message) {
                if ($message['id'] === $messageId) {
                    return $message;
                }
            }
            return null;
        } catch (\Exception $e) {
            Log::error("Error getting message", [
                'appointment_id' => $appointmentId,
                'message_id' => $messageId,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Create a reply message
     */
    public function createReplyMessage(
        int $appointmentId,
        string $messageText,
        string $messageType,
        int $senderId,
        string $senderName,
        string $replyToId,
        string $replyToMessage,
        string $replyToSenderName,
        ?string $mediaUrl = null
    ): ?array {
        try {
            // Create the reply message
            $replyMessage = [
                'id' => 'reply_' . time() . '_' . uniqid(),
                'appointment_id' => $appointmentId,
                'sender_id' => $senderId,
                'sender_name' => $senderName,
                'message' => $messageText,
                'message_type' => $messageType,
                'media_url' => $mediaUrl,
                'timestamp' => now()->toISOString(),
                'created_at' => now()->toISOString(),
                'updated_at' => now()->toISOString(),
                'reply_to_id' => $replyToId,
                'reply_to_message' => $replyToMessage,
                'reply_to_sender_name' => $replyToSenderName,
                'reactions' => [],
                'read_by' => []
            ];

            // Store the reply message
            $this->storeMessage($appointmentId, $replyMessage);

            Log::info("Reply message created", [
                'appointment_id' => $appointmentId,
                'reply_to_id' => $replyToId,
                'sender_id' => $senderId
            ]);

            return $replyMessage;

        } catch (\Exception $e) {
            Log::error("Error creating reply message", [
                'appointment_id' => $appointmentId,
                'reply_to_id' => $replyToId,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Get user name by ID
     */
    private function getUserName(int $userId): string
    {
        // In a real application, you would fetch the user's name from a database or cache
        // For now, we'll return a placeholder or throw an error if not implemented
        return "User #" . $userId;
    }

    private function getDeliveryStatusPriority(string $status): int
    {
        switch ($status) {
            case 'sending':
                return 1;
            case 'sent':
                return 2;
            case 'delivered':
                return 3;
            case 'read':
                return 4;
            default:
                return 0;
        }
    }

    /**
     * Get messages for local storage (optimized format)
     */
    public function getMessagesForLocalStorage(int $appointmentId, string $sessionType = 'appointment'): array
    {
        try {
            $messages = $this->getMessages($appointmentId, $sessionType);

            // Return optimized format for local storage
            return [
                'appointment_id' => $appointmentId,
                'messages' => $messages,
                'last_sync' => now()->toISOString(),
                'message_count' => count($messages)
            ];

        } catch (\Exception $e) {
            Log::error("Failed to get messages for local storage", [
                'appointment_id' => $appointmentId,
                'error' => $e->getMessage()
            ]);
            return [
                'appointment_id' => $appointmentId,
                'messages' => [],
                'last_sync' => now()->toISOString(),
                'message_count' => 0
            ];
        }
    }

    /**
     * Clear messages for an appointment (when appointment ends)
     */
    public function clearMessages(int $appointmentId, string $sessionType = 'appointment'): bool
    {
        try {
            $cacheKey = $this->getCacheKey($appointmentId, $sessionType);

            // Clear the main messages cache
            Cache::forget($cacheKey);

            // Also clear any related cache entries
            $relatedKeys = [
                $cacheKey,
                'chat_room_keys',
                'typing_users_' . $appointmentId,
                'read_status_' . $appointmentId,
                'reactions_' . $appointmentId
            ];

            foreach ($relatedKeys as $key) {
                Cache::forget($key);
            }

            // Update chat room keys list to remove this appointment
            $this->removeFromChatRoomKeys($appointmentId, $sessionType);

            Log::info("Messages and related data cleared for appointment", [
                'appointment_id' => $appointmentId,
                'session_type' => $sessionType,
                'cache_key' => $cacheKey,
                'related_keys_cleared' => $relatedKeys
            ]);

            return true;

        } catch (\Exception $e) {
            Log::error("Failed to clear messages", [
                'appointment_id' => $appointmentId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Get cache key for appointment
     */
    private function getCacheKey(int $appointmentId, string $sessionType = 'appointment'): string
    {
        // Include session type in cache key to prevent conflicts between text sessions and appointments
        // This ensures text_session_3 and appointment_3 have different cache keys
        return self::CACHE_PREFIX . $sessionType . '_' . $appointmentId;
    }

    /**
     * Get active chat rooms (appointments with messages)
     */
    public function getActiveChatRooms(): array
    {
        try {
            $activeRooms = [];
            $pattern = self::CACHE_PREFIX . '*';

            // Get all cache keys that match our pattern
            $keys = Cache::get('chat_room_keys', []);

            foreach ($keys as $key) {
                if (strpos($key, self::CACHE_PREFIX) === 0) {
                    $appointmentId = str_replace(self::CACHE_PREFIX, '', $key);
                    $messages = Cache::get($key, []);

                    if (!empty($messages)) {
                        $activeRooms[] = [
                            'appointment_id' => (int) $appointmentId,
                            'message_count' => count($messages),
                            'last_message' => end($messages),
                            'last_activity' => now()->toISOString()
                        ];
                    }
                }
            }

            return $activeRooms;

        } catch (\Exception $e) {
            Log::error("Failed to get active chat rooms", [
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }

    /**
     * Update chat room keys list
     */
    public function updateChatRoomKeys(int $appointmentId, string $sessionType = 'appointment'): void
    {
        try {
            $keys = Cache::get('chat_room_keys', []);
            $key = $this->getCacheKey($appointmentId, $sessionType);

            if (!in_array($key, $keys)) {
                $keys[] = $key;
                Cache::put('chat_room_keys', $keys, self::CACHE_TTL);
            }

        } catch (\Exception $e) {
            Log::error("Failed to update chat room keys", [
                'appointment_id' => $appointmentId,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Remove appointment from chat room keys list
     */
    private function removeFromChatRoomKeys(int $appointmentId, string $sessionType = 'appointment'): void
    {
        try {
            $keys = Cache::get('chat_room_keys', []);
            $key = $this->getCacheKey($appointmentId, $sessionType);

            // Remove this appointment's key from the list
            $keys = array_filter($keys, function ($k) use ($key) {
                return $k !== $key;
            });

            Cache::put('chat_room_keys', array_values($keys), self::CACHE_TTL);

            Log::info("Removed appointment from chat room keys", [
                'appointment_id' => $appointmentId,
                'session_type' => $sessionType,
                'key' => $key
            ]);

        } catch (\Exception $e) {
            Log::error("Failed to remove from chat room keys", [
                'appointment_id' => $appointmentId,
                'error' => $e->getMessage()
            ]);
        }
    }
}