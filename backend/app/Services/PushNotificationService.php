<?php

namespace App\Services;

use App\Models\User;
use App\Models\Appointment;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Config;

class PushNotificationService
{
    protected $fcmUrl = 'https://fcm.googleapis.com/fcm/send';
    protected $serverKey;

    public function __construct()
    {
        $this->serverKey = config('services.fcm.server_key');
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

        $payload = [
            'registration_ids' => $tokens,
            'notification' => [
                'title' => $title,
                'body' => $body,
                'sound' => 'default',
                'badge' => 1,
            ],
            'data' => $data,
            'priority' => 'high',
        ];

        try {
            $response = Http::withHeaders([
                'Authorization' => 'key=' . $this->serverKey,
                'Content-Type' => 'application/json',
            ])->post($this->fcmUrl, $payload);

            if ($response->successful()) {
                $result = $response->json();
                Log::info("Push notification sent successfully", [
                    'success' => $result['success'] ?? 0,
                    'failure' => $result['failure'] ?? 0,
                    'tokens_count' => count($tokens)
                ]);
                return $result;
            } else {
                Log::error("Failed to send push notification", [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                return false;
            }
        } catch (\Exception $e) {
            Log::error("Exception sending push notification: " . $e->getMessage());
            return false;
        }
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