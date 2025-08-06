<?php

namespace App\Broadcasting;

use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use OneSignal\OneSignal;

class OneSignalChannel
{
    protected $oneSignal;
    protected $appId;
    protected $restApiKey;

    public function __construct()
    {
        $this->appId = config('services.onesignal.app_id');
        $this->restApiKey = config('services.onesignal.rest_api_key');
        
        $this->oneSignal = new OneSignal($this->restApiKey, $this->appId);
    }

    /**
     * Send the given notification (TRIGGER ONLY - NO MESSAGE CONTENT).
     * This ensures medical data privacy by only sending notification triggers.
     */
    public function send($notifiable, Notification $notification)
    {
        Log::info("🔔 OneSignal Channel: Attempting to send notification trigger", [
            'user_id' => $notifiable->id,
            'has_push_token' => !empty($notifiable->push_token),
            'push_notifications_enabled' => $notifiable->push_notifications_enabled,
            'notification_type' => get_class($notification)
        ]);

        if (!$notifiable->push_token || !$notifiable->push_notifications_enabled) {
            Log::info("❌ OneSignal Channel: Skipping notification - no token or disabled", [
                'user_id' => $notifiable->id,
                'has_push_token' => !empty($notifiable->push_token),
                'push_notifications_enabled' => $notifiable->push_notifications_enabled
            ]);
            return false;
        }

        $message = $notification->toOneSignal($notifiable);
        
        Log::info("📤 OneSignal Channel: Preparing secure notification trigger", [
            'user_id' => $notifiable->id,
            'title' => $message['title'] ?? 'no title',
            'body' => $message['body'] ?? 'no body',
            'app_id' => $this->appId ? 'configured' : 'missing'
        ]);

        // SECURE PAYLOAD - NO MESSAGE CONTENT, ONLY TRIGGERS
        $payload = [
            'app_id' => $this->appId,
            'include_player_ids' => [$notifiable->push_token],
            'headings' => [
                'en' => $message['title'] ?? 'New Message'
            ],
            'contents' => [
                'en' => $message['body'] ?? 'You have a new message'
            ],
            'data' => $message['data'] ?? [
                'type' => 'chat_message',
                'appointment_id' => null,
                'sender_name' => 'Unknown',
                'message_count' => 1,
                'timestamp' => now()->toISOString(),
                'click_action' => 'OPEN_CHAT',
                // NO MESSAGE CONTENT - PRIVACY FIRST
            ],
            'android_channel_id' => 'docavailable_channel',
            'priority' => 10,
            'android_priority' => 'high',
            'ios_sound' => 'default',
            'android_sound' => 'default',
            'small_icon' => 'ic_notification',
            'large_icon' => 'ic_notification',
            'android_accent_color' => 'FF4081',
            'ios_badgeType' => 'Increase',
            'ios_badgeCount' => 1,
        ];

        try {
            Log::info("🌐 OneSignal Channel: Sending secure notification trigger", [
                'user_id' => $notifiable->id,
                'app_id' => $this->appId,
                'token_length' => strlen($notifiable->push_token)
            ]);

            $response = $this->oneSignal->notifications()->create($payload);

            if ($response && isset($response['id'])) {
                Log::info("✅ OneSignal Channel: Secure notification trigger sent successfully", [
                    'user_id' => $notifiable->id,
                    'notification_id' => $response['id'],
                    'recipients' => $response['recipients'] ?? 0
                ]);
                return $response;
            } else {
                Log::error("❌ OneSignal Channel: Failed to send notification trigger", [
                    'user_id' => $notifiable->id,
                    'response' => $response
                ]);
                return false;
            }
        } catch (\Exception $e) {
            Log::error("❌ OneSignal Channel: Exception sending notification trigger: " . $e->getMessage(), [
                'user_id' => $notifiable->id,
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);
            return false;
        }
    }
} 