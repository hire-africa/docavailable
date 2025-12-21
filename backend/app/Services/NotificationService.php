<?php

namespace App\Services;

use App\Models\User;
use App\Models\Appointment;
use App\Models\TextSession;
use App\Models\WalletTransaction;
use App\Notifications\AppointmentNotification;
use App\Notifications\TextSessionNotification;
use App\Notifications\WalletNotification;
use App\Notifications\ChatMessageNotification;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    /**
     * Send appointment notification
     */
    public function sendAppointmentNotification(Appointment $appointment, string $type, string $message = null): void
    {
        try {
            $notification = new AppointmentNotification($appointment, $type, $message);
            
            // Send to patient
            if ($appointment->patient) {
                $appointment->patient->notify($notification);
            }
            
            // Send to doctor (for certain types)
            if (in_array($type, ['created', 'cancelled', 'reschedule_accepted', 'reschedule_rejected']) && $appointment->doctor) {
                $appointment->doctor->notify($notification);
            }
            
            Log::info("Appointment notification sent", [
                'appointment_id' => $appointment->id,
                'type' => $type,
                'patient_id' => $appointment->patient_id,
                'doctor_id' => $appointment->doctor_id,
            ]);
        } catch (\Exception $e) {
            Log::error("Failed to send appointment notification: " . $e->getMessage(), [
                'appointment_id' => $appointment->id,
                'type' => $type,
            ]);
        }
    }

    /**
     * Send text session notification
     */
    public function sendTextSessionNotification(TextSession $textSession, string $type, string $message = null): void
    {
        try {
            $notification = new TextSessionNotification($textSession, $type, $message);
            
            // Send to patient
            if ($textSession->patient) {
                $textSession->patient->notify($notification);
            }
            
            // Send to doctor
            if ($textSession->doctor) {
                $textSession->doctor->notify($notification);
            }
            
            Log::info("Text session notification sent", [
                'session_id' => $textSession->id,
                'type' => $type,
                'patient_id' => $textSession->patient_id,
                'doctor_id' => $textSession->doctor_id,
            ]);
        } catch (\Exception $e) {
            Log::error("Failed to send text session notification: " . $e->getMessage(), [
                'session_id' => $textSession->id,
                'type' => $type,
            ]);
        }
    }

    /**
     * Send wallet notification
     */
    public function sendWalletNotification(WalletTransaction $transaction, string $type, string $message = null): void
    {
        try {
            $notification = new WalletNotification($transaction, $type, $message);
            
            // Send to doctor
            if ($transaction->doctor) {
                $transaction->doctor->notify($notification);
            }
            
            Log::info("Wallet notification sent", [
                'transaction_id' => $transaction->id,
                'type' => $type,
                'doctor_id' => $transaction->doctor_id,
            ]);
        } catch (\Exception $e) {
            Log::error("Failed to send wallet notification: " . $e->getMessage(), [
                'transaction_id' => $transaction->id,
                'type' => $type,
            ]);
        }
    }

    /**
     * Send custom notification to user
     */
    public function sendCustomNotification(User $user, string $title, string $message, array $data = []): void
    {
        try {
            $notification = new \App\Notifications\CustomNotification($title, $message, $data);
            $user->notify($notification);
            
            Log::info("Custom notification sent", [
                'user_id' => $user->id,
                'title' => $title,
            ]);
        } catch (\Exception $e) {
            Log::error("Failed to send custom notification: " . $e->getMessage(), [
                'user_id' => $user->id,
                'title' => $title,
            ]);
        }
    }

    /**
     * Send bulk notifications to multiple users
     */
    public function sendBulkNotifications(array $users, string $title, string $message, array $data = []): void
    {
        try {
            $notification = new \App\Notifications\CustomNotification($title, $message, $data);
            
            foreach ($users as $user) {
                if ($user instanceof User) {
                    $user->notify($notification);
                }
            }
            
            Log::info("Bulk notifications sent", [
                'user_count' => count($users),
                'title' => $title,
            ]);
        } catch (\Exception $e) {
            Log::error("Failed to send bulk notifications: " . $e->getMessage(), [
                'user_count' => count($users),
                'title' => $title,
            ]);
        }
    }

    /**
     * Send appointment reminder notifications
     */
    public function sendAppointmentReminders(): void
    {
        try {
            $tomorrow = now()->addDay()->format('Y-m-d');
            
            $appointments = Appointment::where('appointment_date', $tomorrow)
                ->where('status', 0) // Confirmed appointments
                ->with(['patient', 'doctor'])
                ->get();
            
            foreach ($appointments as $appointment) {
                $this->sendAppointmentNotification($appointment, 'reminder');
            }
            
            Log::info("Appointment reminders sent", [
                'count' => $appointments->count(),
                'date' => $tomorrow,
            ]);
        } catch (\Exception $e) {
            Log::error("Failed to send appointment reminders: " . $e->getMessage());
        }
    }

    /**
     * Send session expiration warnings
     */
    public function sendSessionExpirationWarnings(): void
    {
        try {
            $warningTime = now()->subMinutes(8); // 2 minutes before expiration
            
            $sessions = TextSession::where('status', 'active')
                ->where('last_activity_at', '<=', $warningTime)
                ->with(['patient', 'doctor'])
                ->get();
            
            foreach ($sessions as $session) {
                $this->sendTextSessionNotification($session, 'session_warning');
            }
            
            Log::info("Session expiration warnings sent", [
                'count' => $sessions->count(),
            ]);
        } catch (\Exception $e) {
            Log::error("Failed to send session expiration warnings: " . $e->getMessage());
        }
    }

    /**
     * Send chat message notification
     */
    public function sendChatMessageNotification(User $sender, Appointment $appointment, string $message, string $messageId): void
    {
        try {
            // Determine the recipient (the other participant)
            $recipient = null;
            if ($sender->id === $appointment->patient_id) {
                $recipient = $appointment->doctor;
            } else {
                $recipient = $appointment->patient;
            }
            
            if (!$recipient) {
                Log::warning("No recipient found for chat notification", [
                    'appointment_id' => $appointment->id,
                    'sender_id' => $sender->id
                ]);
                return;
            }
            
            // Don't send notification if recipient has disabled push notifications
            if (!$recipient->push_notifications_enabled || !$recipient->push_token) {
                Log::info("Recipient has disabled push notifications", [
                    'recipient_id' => $recipient->id,
                    'appointment_id' => $appointment->id
                ]);
                return;
            }
            
            // Send the notification
            $notification = new ChatMessageNotification($sender, $appointment, $message, $messageId);
            $recipient->notify($notification);
            
            Log::info("Chat notification sent successfully", [
                'appointment_id' => $appointment->id,
                'sender_id' => $sender->id,
                'recipient_id' => $recipient->id,
                'message_id' => $messageId
            ]);
            
        } catch (\Exception $e) {
            Log::error("Failed to send chat notification: " . $e->getMessage(), [
                'appointment_id' => $appointment->id,
                'sender_id' => $sender->id,
                'message_id' => $messageId
            ]);
        }
    }

    /**
     * Get notification statistics for a user
     */
    public function getUserNotificationStats(User $user): array
    {
        $totalNotifications = $user->notifications()->count();
        $unreadNotifications = $user->unreadNotifications()->count();
        
        $notificationsByType = $user->notifications()
            ->selectRaw('JSON_EXTRACT(data, "$.type") as notification_type, COUNT(*) as count')
            ->groupBy('notification_type')
            ->get()
            ->pluck('count', 'notification_type');
        
        return [
            'total_notifications' => $totalNotifications,
            'unread_notifications' => $unreadNotifications,
            'read_notifications' => $totalNotifications - $unreadNotifications,
            'notifications_by_type' => $notificationsByType,
        ];
    }

    /**
     * Create a database notification for a user
     * This is a centralized helper function for creating in-app notifications
     * 
     * @param int $userId The user ID to send the notification to
     * @param string $title The notification title
     * @param string $message The notification message
     * @param string $type The notification type (session, appointment, payment, subscription, system)
     * @param array $metadata Additional metadata to store with the notification
     * @return void
     */
    public function createNotification(int $userId, string $title, string $message, string $type, array $metadata = []): void
    {
        try {
            $user = User::find($userId);
            if (!$user) {
                Log::warning("Cannot create notification: User not found", [
                    'user_id' => $userId,
                    'type' => $type,
                    'title' => $title
                ]);
                return;
            }

            // Prepare notification data
            $notificationData = array_merge([
                'title' => $title,
                'message' => $message,
                'type' => $type,
            ], $metadata);

            // Create notification using CustomNotification class
            $notification = new \App\Notifications\CustomNotification($title, $message, $notificationData);
            $user->notify($notification);

            Log::info("In-app notification created", [
                'user_id' => $userId,
                'type' => $type,
                'title' => $title
            ]);
        } catch (\Exception $e) {
            // Log error but don't throw - notifications should be non-blocking
            Log::error("Failed to create notification: " . $e->getMessage(), [
                'user_id' => $userId,
                'type' => $type,
                'title' => $title,
                'trace' => $e->getTraceAsString()
            ]);
        }
    }
} 