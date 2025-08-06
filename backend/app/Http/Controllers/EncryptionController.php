<?php

namespace App\Http\Controllers;

use App\Models\ChatRoom;
use App\Models\ChatMessage;
use App\Services\EncryptionService;
use App\Services\ChatService;
use App\Services\TextSessionMessageService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class EncryptionController extends Controller
{
    protected $encryptionService;
    protected $chatService;
    protected $textSessionMessageService;

    public function __construct(EncryptionService $encryptionService, ChatService $chatService, TextSessionMessageService $textSessionMessageService)
    {
        $this->encryptionService = $encryptionService;
        $this->chatService = $chatService;
        $this->textSessionMessageService = $textSessionMessageService;
    }

    /**
     * Generate encryption keys for a user
     */
    public function generateKeys(Request $request): JsonResponse
    {
        $user = Auth::user();

        try {
            // Check if user already has encryption keys
            if ($user->hasEncryptionKeys()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Encryption keys already exist for this user'
                ], 400);
            }

            // Generate key pair
            $keyPair = $this->encryptionService->generateKeyPair();
            
            // Store keys in user record
            $user->update([
                'public_key' => $keyPair['public_key'],
                'private_key' => $keyPair['private_key'],
                'encryption_enabled' => true,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Encryption keys generated successfully',
                'data' => [
                    'encryption_enabled' => true,
                    'public_key' => $keyPair['public_key']
                ]
            ]);
        } catch (\Exception $e) {
            // Log the detailed error
            \Log::error('Failed to generate encryption keys for user ' . $user->id . ': ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate encryption keys: ' . $e->getMessage(),
                'debug_info' => [
                    'openssl_loaded' => extension_loaded('openssl'),
                    'openssl_version' => defined('OPENSSL_VERSION_TEXT') ? OPENSSL_VERSION_TEXT : 'Unknown',
                    'memory_limit' => ini_get('memory_limit'),
                    'max_execution_time' => ini_get('max_execution_time'),
                ]
            ], 500);
        }
    }

    /**
     * Enable encryption for a chat room
     */
    public function enableRoomEncryption(Request $request, int $roomId): JsonResponse
    {
        $user = Auth::user();

        try {
            // First try to find the room by ID
            $room = ChatRoom::forUser($user->id)->find($roomId);
            
            // If not found, check if this might be a text session ID
            if (!$room) {
                // Look for a chat room with name "text_session_{$roomId}"
                $room = ChatRoom::forUser($user->id)
                    ->where('name', "text_session_{$roomId}")
                    ->first();
            }
            
            if (!$room) {
                return response()->json([
                    'success' => false,
                    'message' => 'Chat room not found or access denied'
                ], 404);
            }

            $success = $this->chatService->enableRoomEncryption($room->id, $user->id);

            return response()->json([
                'success' => true,
                'message' => 'Room encryption enabled successfully',
                'data' => [
                    'room_id' => $room->id, // Return the actual room ID
                    'encryption_enabled' => true
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to enable room encryption: ' . $e->getMessage()
            ], 400);
        }
    }

    /**
     * Get room encryption key
     */
    public function getRoomKey(Request $request, int $roomId): JsonResponse
    {
        $user = Auth::user();

        try {
            // First try to find the room by ID
            $room = ChatRoom::forUser($user->id)->find($roomId);
            
            // If not found, check if this might be a text session ID
            if (!$room) {
                // Look for a chat room with name "text_session_{$roomId}"
                $room = ChatRoom::forUser($user->id)
                    ->where('name', "text_session_{$roomId}")
                    ->first();
            }
            
            if (!$room || !$room->isEncrypted()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Room encryption not enabled or access denied'
                ], 404);
            }

            $roomKey = $room->getEncryptionKey();
            if (!$roomKey) {
                return response()->json([
                    'success' => false,
                    'message' => 'Room encryption key not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'room_id' => $room->id, // Return the actual room ID
                    'encryption_key' => $roomKey
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get room key: ' . $e->getMessage()
            ], 400);
        }
    }

    /**
     * Decrypt a message
     */
    public function decryptMessage(Request $request, int $messageId): JsonResponse
    {
        $user = Auth::user();
        $request->validate([
            'room_key' => 'required|string'
        ]);

        try {
            $message = ChatMessage::findOrFail($messageId);
            
            // Check if user has access to this message
            if (!$message->chatRoom->hasParticipant($user->id)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Access denied to this message'
                ], 403);
            }

            $decryptedContent = $this->chatService->decryptMessage($message, $request->room_key);

            return response()->json([
                'success' => true,
                'data' => [
                    'message_id' => $messageId,
                    'decrypted_content' => $decryptedContent,
                    'is_encrypted' => $message->isEncrypted()
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to decrypt message: ' . $e->getMessage()
            ], 400);
        }
    }

    /**
     * Get user's encryption status
     */
    public function getEncryptionStatus(Request $request): JsonResponse
    {
        $user = Auth::user();

        return response()->json([
            'success' => true,
            'data' => [
                'encryption_enabled' => $user->isEncryptionEnabled(),
                'has_keys' => $user->hasEncryptionKeys(),
                'public_key' => $user->getPublicKey()
            ]
        ]);
    }

    /**
     * Get encryption status for a chat room
     */
    public function getRoomEncryptionStatus(Request $request, int $roomId): JsonResponse
    {
        $user = Auth::user();

        try {
            // First try to find the room by ID
            $room = ChatRoom::forUser($user->id)->find($roomId);
            
            // If not found, check if this might be a text session ID
            if (!$room) {
                // Look for a chat room with name "text_session_{$roomId}"
                $room = ChatRoom::forUser($user->id)
                    ->where('name', "text_session_{$roomId}")
                    ->first();
            }
            
            if (!$room) {
                return response()->json([
                    'success' => false,
                    'message' => 'Chat room not found or access denied'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'room_id' => $room->id, // Return the actual room ID
                    'encryption_enabled' => $room->isEncrypted(),
                    'can_enable' => $user->isEncryptionEnabled()
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get room encryption status: ' . $e->getMessage()
            ], 400);
        }
    }
} 