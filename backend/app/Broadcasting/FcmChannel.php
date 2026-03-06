<?php

namespace App\Broadcasting;

use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Google\Auth\ApplicationDefaultCredentials;
use Google\Auth\Cache\SysVCacheItemPool;
use Google\Auth\Credentials\ServiceAccountCredentials;

class FcmChannel
{
    protected $fcmUrl = 'https://fcm.googleapis.com/v1/projects/{project_id}/messages:send';
    protected $projectId;
    protected $accessToken;

    public function __construct()
    {
        $this->projectId = config('services.fcm.project_id');
    }

    /**
     * Get access token for FCM V1 API
     */
    protected function getAccessToken()
    {
        if ($this->accessToken) {
            return $this->accessToken;
        }

        try {
            // First try to get from environment variable (for production)
            $serviceAccountJson = config('services.fcm.service_account_json');

            if ($serviceAccountJson) {
                Log::info("🔑 FCM V1: Using service account from environment variable");
                $credentials = new ServiceAccountCredentials(
                    'https://www.googleapis.com/auth/firebase.messaging',
                    json_decode($serviceAccountJson, true)
                );
            } else {
                // Fallback to file path (for local development)
                $credentialsPath = config('services.fcm.credentials_path');

                // If it's a relative path, make it absolute
                if ($credentialsPath && !str_starts_with($credentialsPath, '/') && !str_starts_with($credentialsPath, 'C:')) {
                    $credentialsPath = storage_path($credentialsPath);
                } elseif (!$credentialsPath) {
                    $credentialsPath = storage_path('app/firebase-service-account.json');
                }

                if (!file_exists($credentialsPath)) {
                    Log::error("❌ FCM V1: Service account not found in environment variable or file at: {$credentialsPath}");
                    return null;
                }

                Log::info("🔑 FCM V1: Using service account from file: {$credentialsPath}");
                $credentials = new ServiceAccountCredentials(
                    'https://www.googleapis.com/auth/firebase.messaging',
                    json_decode(file_get_contents($credentialsPath), true)
                );
            }

            $this->accessToken = $credentials->fetchAuthToken()['access_token'];
            Log::info("✅ FCM V1: Access token obtained successfully");
            return $this->accessToken;
        } catch (\Exception $e) {
            Log::error("❌ FCM V1: Failed to get access token: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Send the given notification.
     */
    public function send($notifiable, Notification $notification)
    {
        Log::info("🔔 FCM V1 Channel: Attempting to send notification", [
            'user_id' => $notifiable->id,
            'has_push_token' => !empty($notifiable->push_token),
            'push_notifications_enabled' => $notifiable->push_notifications_enabled,
            'notification_type' => get_class($notification),
            'project_id' => $this->projectId
        ]);

        if (!$notifiable->push_token || !$notifiable->push_notifications_enabled) {
            Log::info("❌ FCM V1 Channel: Skipping notification - no token or disabled", [
                'user_id' => $notifiable->id,
                'has_push_token' => !empty($notifiable->push_token),
                'push_notifications_enabled' => $notifiable->push_notifications_enabled
            ]);
            return false;
        }

        $message = $notification->toFcm($notifiable);

        // Determine channel and type based on notification data
        $data = $message['data'] ?? [];
        $type = $data['type'] ?? '';
        $isIncomingCall = ($type === 'incoming_call' || ($data['isIncomingCall'] ?? '') === 'true');
        $channelId = $isIncomingCall ? 'incoming_calls_v3' : 'urgent_medical';

        Log::info("📤 FCM V1 Channel: Preparing FCM payload", [
            'user_id' => $notifiable->id,
            'type' => $type,
            'is_incoming_call' => $isIncomingCall,
            'has_notification_block' => isset($message['notification']),
            'project_id' => $this->projectId
        ]);

        // ⚠️ CRITICAL: For incoming calls, send DATA-ONLY message
        // This ensures background handler runs even when app is killed
        $payload = [
            'message' => [
                'token' => $notifiable->push_token,
                'data' => array_map('strval', $data), // Ensure all data values are strings for FCM V1
                'android' => [
                    'priority' => 'high', // High priority for immediate delivery
                ],
                'apns' => [
                    'headers' => [
                        'apns-priority' => '10', // High priority for APNs
                    ],
                    'payload' => [
                        'aps' => [
                            'content-available' => 1,
                        ],
                    ],
                ],
            ]
        ];

        // Only add notification block for NON-CALL messages
        // Incoming calls use CallKeep native UI, not notifications
        if (!$isIncomingCall && isset($message['notification'])) {
            // 🛠 FIX: Allow channel_id override from notification data
            // If data contains 'channel_id', use it. Otherwise fall back to defaults.
            $finalChannelId = $data['channel_id'] ?? $channelId;

            // Optional: If user specifically wants to move AWAY from "urgent_medical" 
            // but didn't specify a new one, we can use "default" or "messages"
            if ($finalChannelId === 'urgent_medical') {
                $finalChannelId = $data['android_channel_id'] ?? 'urgent_medical'; // Fallback to another legacy field if needed
            }

            $payload['message']['notification'] = [
                'title' => $message['notification']['title'] ?? '',
                'body' => $message['notification']['body'] ?? '',
            ];
            $payload['message']['android']['notification'] = [
                'sound' => 'default',
                'notification_priority' => 'PRIORITY_MAX',
                'visibility' => 'PUBLIC'
            ];

            // Only add channel_id if it's NOT the legacy "urgent_medical" (which user wants to avoid)
            // or if it's specifically overridden in data.
            if ($finalChannelId && $finalChannelId !== 'urgent_medical') {
                $payload['message']['android']['notification']['channel_id'] = $finalChannelId;
            }
        }

        // Add/Merge iOS config from notification if present
        if (isset($message['apns'])) {
            $payload['message']['apns'] = array_replace_recursive($payload['message']['apns'], $message['apns']);
        }

        try {
            $accessToken = $this->getAccessToken();
            if (!$accessToken) {
                Log::error("❌ FCM V1 Channel: Failed to get access token");
                return false;
            }

            $url = str_replace('{project_id}', $this->projectId, $this->fcmUrl);

            Log::info("🌐 FCM V1 Channel: Sending HTTP request to FCM V1 API", [
                'user_id' => $notifiable->id,
                'url' => $url,
                'token_length' => strlen($notifiable->push_token)
            ]);

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $accessToken,
                'Content-Type' => 'application/json',
            ])->post($url, $payload);

            if ($response->successful()) {
                $result = $response->json();
                Log::info("✅ FCM V1 Channel: Notification sent successfully", [
                    'user_id' => $notifiable->id,
                    'name' => $result['name'] ?? 'no name',
                    'response' => $result
                ]);
                return $result;
            } else {
                $status = $response->status();
                $body = $response->json();
                $errorCode = $body['error']['status'] ?? 'UNKNOWN';
                $details = $body['error']['details'] ?? [];

                Log::error("❌ FCM V1 Channel: Failed to send notification", [
                    'user_id' => $notifiable->id,
                    'status' => $status,
                    'error_code' => $errorCode,
                    'body' => $body
                ]);

                // Handle stale tokens (UNREGISTERED or INVALID_ARGUMENT with specific message)
                if ($errorCode === 'UNREGISTERED' || ($errorCode === 'INVALID_ARGUMENT' && str_contains(json_encode($body), 'is not a valid FCM registration token'))) {
                    Log::warning("⚠️ FCM V1 Channel: Token is invalid or unregistered. Inactivating token for user.", [
                        'user_id' => $notifiable->id,
                        'token_preview' => substr($notifiable->push_token, 0, 10) . '...'
                    ]);

                    // Atomic update to clear the token and disable push notifications
                    \App\Models\User::where('id', $notifiable->id)->update([
                        'push_token' => null,
                        'push_notifications_enabled' => false
                    ]);
                }

                return false;
            }
        } catch (\Exception $e) {
            Log::error("❌ FCM V1 Channel: Exception sending notification: " . $e->getMessage(), [
                'user_id' => $notifiable->id,
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);
            return false;
        }
    }
}
