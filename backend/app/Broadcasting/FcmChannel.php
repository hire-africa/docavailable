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
    protected $fcmUrl = 'https://fcm.googleapis.com/fcm/send';
    protected $serverKey;

    public function __construct()
    {
        $this->serverKey = config('services.fcm.server_key');
    }

    /**
     * Get server key for FCM
     */
    protected function getServerKey()
    {
        return $this->serverKey;
    }

    /**
     * Send the given notification.
     */
    public function send($notifiable, Notification $notification)
    {
        Log::info("🔔 FCM Channel: Attempting to send notification", [
            'user_id' => $notifiable->id,
            'has_push_token' => !empty($notifiable->push_token),
            'push_notifications_enabled' => $notifiable->push_notifications_enabled,
            'notification_type' => get_class($notification),
            'server_key_configured' => !empty($this->serverKey)
        ]);

        if (!$notifiable->push_token || !$notifiable->push_notifications_enabled) {
            Log::info("❌ FCM Channel: Skipping notification - no token or disabled", [
                'user_id' => $notifiable->id,
                'has_push_token' => !empty($notifiable->push_token),
                'push_notifications_enabled' => $notifiable->push_notifications_enabled
            ]);
            return false;
        }

        $message = $notification->toFcm($notifiable);
        
        Log::info("📤 FCM Channel: Preparing FCM payload", [
            'user_id' => $notifiable->id,
            'title' => $message['notification']['title'] ?? 'no title',
            'body' => $message['notification']['body'] ?? 'no body',
            'server_key_configured' => !empty($this->serverKey)
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

        // FCM Legacy API payload structure
        $payload = [
            'to' => $notifiable->push_token,
            'notification' => [
                'title' => $message['notification']['title'] ?? '',
                'body' => $message['notification']['body'] ?? '',
                'sound' => 'default',
                'badge' => 1,
            ],
            'data' => $data,
            'priority' => 'high',
            'android' => [
                'priority' => 'high',
                'notification' => [
                    'sound' => 'default',
                    'channel_id' => $channelId,
                    'notification_priority' => $channelId === 'calls' ? 'PRIORITY_MAX' : 'PRIORITY_HIGH',
                    'visibility' => 1
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
        ];

        try {
            $serverKey = $this->getServerKey();
            if (!$serverKey) {
                Log::error("❌ FCM Channel: Failed to get server key");
                return false;
            }
            
            Log::info("🌐 FCM Channel: Sending HTTP request to FCM Legacy API", [
                'user_id' => $notifiable->id,
                'url' => $this->fcmUrl,
                'token_length' => strlen($notifiable->push_token)
            ]);

            $response = Http::withHeaders([
                'Authorization' => 'key=' . $serverKey,
                'Content-Type' => 'application/json',
            ])->post($this->fcmUrl, $payload);

            if ($response->successful()) {
                $result = $response->json();
                Log::info("✅ FCM Channel: Notification sent successfully", [
                    'user_id' => $notifiable->id,
                    'name' => $result['name'] ?? 'no name',
                    'response' => $result
                ]);
                return $result;
            } else {
                Log::error("❌ FCM Channel: Failed to send notification", [
                    'user_id' => $notifiable->id,
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                return false;
            }
        } catch (\Exception $e) {
            Log::error("❌ FCM Channel: Exception sending notification: " . $e->getMessage(), [
                'user_id' => $notifiable->id,
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);
            return false;
        }
    }
}
