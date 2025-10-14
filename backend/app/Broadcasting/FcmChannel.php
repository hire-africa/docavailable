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
        
        Log::info("📤 FCM V1 Channel: Preparing FCM payload", [
            'user_id' => $notifiable->id,
            'title' => $message['notification']['title'] ?? 'no title',
            'body' => $message['notification']['body'] ?? 'no body',
            'project_id' => $this->projectId
        ]);

        // Determine channel based on notification type
        $data = $message['data'] ?? [];
        $type = $data['type'] ?? '';
        $channelId = 'calls'; // default
        
        if (str_contains($type, 'chat_message') || str_contains($type, 'new_message')) {
            $channelId = 'messages';
        } elseif (str_contains($type, 'appointment')) {
            $channelId = 'appointments';
        }

        // FCM V1 API payload structure
        $payload = [
            'message' => [
                'token' => $notifiable->push_token,
                'notification' => [
                    'title' => $message['notification']['title'] ?? '',
                    'body' => $message['notification']['body'] ?? '',
                ],
                'data' => $data,
                'android' => [
                    'priority' => 'high',
                    'notification' => [
                        'sound' => 'default',
                        'channel_id' => $channelId,
                        'notification_priority' => $channelId === 'calls' ? 'PRIORITY_MAX' : 'PRIORITY_HIGH',
                        'visibility' => 'PUBLIC'
                    ],
                ],
                'apns' => [
                    'payload' => [
                        'aps' => [
                            'sound' => 'default',
                            'badge' => 1,
                        ],
                    ],
                ],
            ]
        ];

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
                Log::error("❌ FCM V1 Channel: Failed to send notification", [
                    'user_id' => $notifiable->id,
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
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
