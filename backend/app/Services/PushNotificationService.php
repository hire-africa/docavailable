<?php

namespace App\Services;

use App\Models\User;
use App\Models\Appointment;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Config;
use Google\Auth\ApplicationDefaultCredentials;
use Google\Auth\Cache\SysVCacheItemPool;
use Google\Auth\Credentials\ServiceAccountCredentials;

class PushNotificationService
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
                Log::info("🔑 PushNotificationService V1: Using service account from environment variable");
                $credentials = new ServiceAccountCredentials(
                    'https://www.googleapis.com/auth/firebase.messaging',
                    json_decode($serviceAccountJson, true)
                );
            } else {
                // Fallback to file path (for local development)
                $credentialsPath = config('services.fcm.credentials_path') ?: storage_path('app/firebase-service-account.json');
                
                if (!file_exists($credentialsPath)) {
                    Log::error("❌ PushNotificationService V1: Service account not found in environment variable or file at: {$credentialsPath}");
                    return null;
                }
                
                Log::info("🔑 PushNotificationService V1: Using service account from file: {$credentialsPath}");
                $credentials = new ServiceAccountCredentials(
                    'https://www.googleapis.com/auth/firebase.messaging',
                    json_decode(file_get_contents($credentialsPath), true)
                );
            }
            
            $this->accessToken = $credentials->fetchAuthToken()['access_token'];
            Log::info("✅ PushNotificationService V1: Access token obtained successfully");
            return $this->accessToken;
        } catch (\Exception $e) {
            Log::error("❌ PushNotificationService V1: Failed to get access token: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Send push notification to a single user
     */
    public function sendToUser(User $user, string $title, string $body, array $data = [])
    {
        if (!$user->push_token) {
            Log::info("User {$user->id} has no push token");
            return false;
        }

        return $this->sendToTokens([$user->push_token], $title, $body, $data);
    }

    /**
     * Send push notification to multiple users
     */
    public function sendToUsers(array $users, string $title, string $body, array $data = [])
    {
        $tokens = collect($users)
            ->pluck('push_token')
            ->filter()
            ->toArray();

        if (empty($tokens)) {
            Log::info("No push tokens found for users");
            return false;
        }

        return $this->sendToTokens($tokens, $title, $body, $data);
    }

    /**
     * Send push notification to specific tokens
     */
    public function sendToTokens(array $tokens, string $title, string $body, array $data = [])
    {
        if (empty($tokens)) {
            return false;
        }

        // Determine channel based on notification type
        $type = $data['type'] ?? '';
        $channelId = 'calls'; // default
        
        if (str_contains($type, 'chat_message') || str_contains($type, 'new_message')) {
            $channelId = 'messages';
        } elseif (str_contains($type, 'appointment')) {
            $channelId = 'appointments';
        }

        // FCM V1 API payload structure - send to each token individually
        $results = [];
        $accessToken = $this->getAccessToken();
        
        if (!$accessToken) {
            Log::error("❌ PushNotificationService V1: Failed to get access token");
            return false;
        }

        $url = str_replace('{project_id}', $this->projectId, $this->fcmUrl);

        foreach ($tokens as $token) {
            $payload = [
                'message' => [
                    'token' => $token,
                    'notification' => [
                        'title' => $title,
                        'body' => $body,
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
                Log::info("🌐 PushNotificationService V1: Sending notification to token", [
                    'token_length' => strlen($token),
                    'title' => $title,
                    'channel' => $channelId
                ]);

                $response = Http::withHeaders([
                    'Authorization' => 'Bearer ' . $accessToken,
                    'Content-Type' => 'application/json',
                ])->post($url, $payload);

                if ($response->successful()) {
                    $result = $response->json();
                    Log::info("✅ PushNotificationService V1: Notification sent successfully", [
                        'name' => $result['name'] ?? 'no name',
                        'response' => $result
                    ]);
                    $results[] = $result;
                } else {
                    Log::error("❌ PushNotificationService V1: Failed to send notification", [
                        'status' => $response->status(),
                        'body' => $response->body()
                    ]);
                    $results[] = false;
                }
            } catch (\Exception $e) {
                Log::error("❌ PushNotificationService V1: Exception sending notification: " . $e->getMessage(), [
                    'error' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine()
                ]);
                $results[] = false;
            }
        }

        $successCount = count(array_filter($results));
        Log::info("📊 PushNotificationService V1: Batch results", [
            'success' => $successCount,
            'failure' => count($tokens) - $successCount,
            'total' => count($tokens)
        ]);

        return $successCount > 0 ? $results : false;
    }

    /**
     * Send appointment notification
     */
    public function sendAppointmentNotification(Appointment $appointment, string $type)
    {
        $patient = $appointment->patient;
        $doctor = $appointment->doctor;

        switch ($type) {
            case 'created':
                $this->sendToUser($patient, 'Appointment Booked', 'Your appointment has been successfully booked');
                $this->sendToUser($doctor, 'New Appointment', 'You have a new appointment booking');
                break;

            case 'confirmed':
                $this->sendToUser($patient, 'Appointment Confirmed', 'Your appointment has been confirmed');
                break;

            case 'cancelled':
                $this->sendToUser($patient, 'Appointment Cancelled', 'Your appointment has been cancelled');
                $this->sendToUser($doctor, 'Appointment Cancelled', 'An appointment has been cancelled');
                break;

            case 'reminder':
                $this->sendToUser($patient, 'Appointment Reminder', 'You have an appointment tomorrow');
                break;

            case 'reschedule_proposed':
                $this->sendToUser($patient, 'Reschedule Proposed', 'Your doctor has proposed a reschedule');
                break;

            case 'reschedule_accepted':
                $this->sendToUser($doctor, 'Reschedule Accepted', 'Patient has accepted the reschedule');
                break;

            case 'reschedule_rejected':
                $this->sendToUser($doctor, 'Reschedule Rejected', 'Patient has rejected the reschedule');
                break;
        }
    }

    /**
     * Send review notification
     */
    public function sendReviewNotification(User $doctor, User $patient)
    {
        $this->sendToUser($doctor, 'New Review', "You have received a new review from {$patient->first_name}");
    }

    /**
     * Send doctor approval notification
     */
    public function sendDoctorApprovalNotification(User $doctor, bool $approved)
    {
        $title = $approved ? 'Account Approved' : 'Account Rejected';
        $body = $approved 
            ? 'Your doctor account has been approved' 
            : 'Your doctor account has been rejected';

        $this->sendToUser($doctor, $title, $body);
    }

    /**
     * Send subscription notification
     */
    public function sendSubscriptionNotification(User $user, string $type)
    {
        switch ($type) {
            case 'created':
                $this->sendToUser($user, 'Subscription Active', 'Your subscription has been activated');
                break;
            case 'expired':
                $this->sendToUser($user, 'Subscription Expired', 'Your subscription has expired');
                break;
            case 'renewed':
                $this->sendToUser($user, 'Subscription Renewed', 'Your subscription has been renewed');
                break;
        }
    }

    /**
     * Update user's push token
     */
    public function updatePushToken(User $user, string $token)
    {
        $user->update(['push_token' => $token]);
        Log::info("Push token updated for user {$user->id}");
    }

    /**
     * Remove user's push token
     */
    public function removePushToken(User $user)
    {
        $user->update(['push_token' => null]);
        Log::info("Push token removed for user {$user->id}");
    }
} 