<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Notifications\DatabaseNotification;

class NotificationController extends Controller
{
    /**
     * Get user's notifications
     */
    public function getNotifications(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        $perPage = $request->get('per_page', 15);
        $unreadOnly = $request->boolean('unread_only', false);
        
        $query = $user->notifications();
        
        if ($unreadOnly) {
            $query->whereNull('read_at');
        }
        
        $notifications = $query->orderBy('created_at', 'desc')
            ->paginate($perPage);
        
        return response()->json([
            'success' => true,
            'data' => [
                'notifications' => $notifications->items(),
                'pagination' => [
                    'current_page' => $notifications->currentPage(),
                    'last_page' => $notifications->lastPage(),
                    'per_page' => $notifications->perPage(),
                    'total' => $notifications->total(),
                ],
                'unread_count' => $user->unreadNotifications()->count(),
            ],
        ]);
    }

    /**
     * Mark notification as read
     */
    public function markAsRead(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'notification_id' => 'required|string|exists:notifications,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = Auth::user();
        $notification = $user->notifications()->findOrFail($request->notification_id);
        
        $notification->markAsRead();
        
        return response()->json([
            'success' => true,
            'message' => 'Notification marked as read',
            'data' => [
                'unread_count' => $user->unreadNotifications()->count(),
            ],
        ]);
    }

    /**
     * Mark all notifications as read
     */
    public function markAllAsRead(): JsonResponse
    {
        $user = Auth::user();
        $user->unreadNotifications()->update(['read_at' => now()]);
        
        return response()->json([
            'success' => true,
            'message' => 'All notifications marked as read',
            'data' => [
                'unread_count' => 0,
            ],
        ]);
    }

    /**
     * Delete a notification
     */
    public function deleteNotification(Request $request, string $id): JsonResponse
    {
        $user = Auth::user();
        $notification = $user->notifications()->findOrFail($id);
        
        $notification->delete();
        
        return response()->json([
            'success' => true,
            'message' => 'Notification deleted successfully',
            'data' => [
                'unread_count' => $user->unreadNotifications()->count(),
            ],
        ]);
    }

    /**
     * Get notification preferences
     */
    public function getPreferences(): JsonResponse
    {
        $user = Auth::user();
        
        return response()->json([
            'success' => true,
            'data' => [
                'email_notifications_enabled' => $user->email_notifications_enabled,
                'push_notifications_enabled' => $user->push_notifications_enabled,
                'sms_notifications_enabled' => $user->sms_notifications_enabled,
                'notification_preferences' => $user->notification_preferences ?? [],
                'has_push_token' => !empty($user->push_token),
            ],
        ]);
    }

    /**
     * Update notification preferences
     */
    public function updatePreferences(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email_notifications_enabled' => 'boolean',
            'push_notifications_enabled' => 'boolean',
            'sms_notifications_enabled' => 'boolean',
            'notification_preferences' => 'array',
            'notification_preferences.*' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = Auth::user();
        
        $user->update($request->only([
            'email_notifications_enabled',
            'push_notifications_enabled',
            'sms_notifications_enabled',
            'notification_preferences',
        ]));
        
        return response()->json([
            'success' => true,
            'message' => 'Notification preferences updated successfully',
            'data' => [
                'email_notifications_enabled' => $user->email_notifications_enabled,
                'push_notifications_enabled' => $user->push_notifications_enabled,
                'sms_notifications_enabled' => $user->sms_notifications_enabled,
                'notification_preferences' => $user->notification_preferences,
            ],
        ]);
    }

    /**
     * Update push token
     */
    public function updatePushToken(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'push_token' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = Auth::user();
        $user->update(['push_token' => $request->push_token]);
        
        return response()->json([
            'success' => true,
            'message' => 'Push token updated successfully',
        ]);
    }

    /**
     * Remove push token
     */
    public function removePushToken(): JsonResponse
    {
        $user = Auth::user();
        $user->update(['push_token' => null]);
        
        return response()->json([
            'success' => true,
            'message' => 'Push token removed successfully',
        ]);
    }

    /**
     * Get notification statistics
     */
    public function getStats(): JsonResponse
    {
        $user = Auth::user();
        
        $totalNotifications = $user->notifications()->count();
        $unreadNotifications = $user->unreadNotifications()->count();
        $readNotifications = $totalNotifications - $unreadNotifications;
        
        // Get notifications by type
        $notificationsByType = $user->notifications()
            ->selectRaw('JSON_EXTRACT(data, "$.type") as notification_type, COUNT(*) as count')
            ->groupBy('notification_type')
            ->get()
            ->pluck('count', 'notification_type');
        
        return response()->json([
            'success' => true,
            'data' => [
                'total_notifications' => $totalNotifications,
                'unread_notifications' => $unreadNotifications,
                'read_notifications' => $readNotifications,
                'notifications_by_type' => $notificationsByType,
                'preferences' => [
                    'email_enabled' => $user->email_notifications_enabled,
                    'push_enabled' => $user->push_notifications_enabled,
                    'sms_enabled' => $user->sms_notifications_enabled,
                    'has_push_token' => !empty($user->push_token),
                ],
            ],
        ]);
    }

    /**
     * Get notification settings (frontend expects this structure)
     */
    public function getNotificationSettings(): JsonResponse
    {
        $user = Auth::user();
        
        // Get existing preferences or use defaults
        $preferences = $user->notification_preferences ?? [];
        
        // Return the structure that the frontend expects
        $settings = [
            'communication' => [
                'email' => $preferences['communication']['email'] ?? $user->email_notifications_enabled ?? true,
                'sms' => $preferences['communication']['sms'] ?? $user->sms_notifications_enabled ?? true,
                'push' => $preferences['communication']['push'] ?? $user->push_notifications_enabled ?? true,
                'inApp' => $preferences['communication']['inApp'] ?? true,
            ],
            'appointments' => [
                'reminders' => $preferences['appointments']['reminders'] ?? true,
                'confirmations' => $preferences['appointments']['confirmations'] ?? true,
                'cancellations' => $preferences['appointments']['cancellations'] ?? true,
                'reschedules' => $preferences['appointments']['reschedules'] ?? true,
            ],
            'consultation' => [
                'newMessages' => $preferences['consultation']['newMessages'] ?? true,
                'consultationUpdates' => $preferences['consultation']['consultationUpdates'] ?? true,
                'feedbackRequests' => $preferences['consultation']['feedbackRequests'] ?? true,
            ],
            'system' => [
                'securityAlerts' => $preferences['system']['securityAlerts'] ?? true,
                'maintenanceUpdates' => $preferences['system']['maintenanceUpdates'] ?? false,
                'featureAnnouncements' => $preferences['system']['featureAnnouncements'] ?? false,
            ],
        ];
        
        return response()->json([
            'success' => true,
            'data' => $settings,
        ]);
    }

    /**
     * Update notification settings (frontend expects this structure)
     */
    public function updateNotificationSettings(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'communication' => 'array',
            'communication.email' => 'boolean',
            'communication.sms' => 'boolean',
            'communication.push' => 'boolean',
            'communication.inApp' => 'boolean',
            'appointments' => 'array',
            'appointments.reminders' => 'boolean',
            'appointments.confirmations' => 'boolean',
            'appointments.cancellations' => 'boolean',
            'appointments.reschedules' => 'boolean',
            'consultation' => 'array',
            'consultation.newMessages' => 'boolean',
            'consultation.consultationUpdates' => 'boolean',
            'consultation.feedbackRequests' => 'boolean',
            'system' => 'array',
            'system.securityAlerts' => 'boolean',
            'system.maintenanceUpdates' => 'boolean',
            'system.featureAnnouncements' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = Auth::user();
        
        // Update the notification preferences
        $user->update([
            'notification_preferences' => $request->all(),
            // Also update the basic notification flags based on communication settings
            'email_notifications_enabled' => $request->input('communication.email', true),
            'push_notifications_enabled' => $request->input('communication.push', true),
            'sms_notifications_enabled' => $request->input('communication.sms', false),
        ]);
        
        return response()->json([
            'success' => true,
            'message' => 'Notification settings updated successfully',
            'data' => $request->all(),
        ]);
    }

    /**
     * Get privacy settings (frontend expects this structure)
     */
    public function getPrivacySettings(): JsonResponse
    {
        $user = Auth::user();
        
        // Get existing privacy preferences or use defaults
        $preferences = $user->privacy_preferences ?? [];
        
        // Return the structure that the frontend expects
        $settings = [
            'profileVisibility' => [
                'showToDoctors' => $preferences['profileVisibility']['showToDoctors'] ?? true,
                'showToPatients' => $preferences['profileVisibility']['showToPatients'] ?? ($user->user_type === 'doctor'),
            ],
            'dataSharing' => [
                'allowAnalytics' => $preferences['dataSharing']['allowAnalytics'] ?? true,
                'allowResearch' => $preferences['dataSharing']['allowResearch'] ?? false,
            ],
            'privacy' => [
                'anonymousMode' => $preferences['privacy']['anonymousMode'] ?? false,
            ],
            'communication' => [
                'email' => $preferences['communication']['email'] ?? $user->email_notifications_enabled ?? true,
                'sms' => $preferences['communication']['sms'] ?? $user->sms_notifications_enabled ?? true,
                'push' => $preferences['communication']['push'] ?? $user->push_notifications_enabled ?? true,
            ],
            'security' => [
                'loginNotifications' => $preferences['security']['loginNotifications'] ?? true,
                'sessionTimeout' => $preferences['security']['sessionTimeout'] ?? 30,
            ],
        ];
        
        return response()->json([
            'success' => true,
            'data' => $settings,
        ]);
    }

    /**
     * Update privacy settings (frontend expects this structure)
     */
    public function updatePrivacySettings(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'profileVisibility' => 'array',
            'profileVisibility.showToDoctors' => 'boolean',
            'profileVisibility.showToPatients' => 'boolean',
            'dataSharing' => 'array',
            'dataSharing.allowAnalytics' => 'boolean',
            'dataSharing.allowResearch' => 'boolean',
            'privacy' => 'array',
            'privacy.anonymousMode' => 'boolean',
            'communication' => 'array',
            'communication.email' => 'boolean',
            'communication.sms' => 'boolean',
            'communication.push' => 'boolean',
            'security' => 'array',
            'security.loginNotifications' => 'boolean',
            'security.sessionTimeout' => 'integer|min:5|max:1440',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = Auth::user();
        
        // Update the privacy preferences
        $user->update([
            'privacy_preferences' => $request->all(),
            // Also update the basic notification flags based on communication settings
            'email_notifications_enabled' => $request->input('communication.email', true),
            'push_notifications_enabled' => $request->input('communication.push', true),
            'sms_notifications_enabled' => $request->input('communication.sms', false),
        ]);
        
        return response()->json([
            'success' => true,
            'message' => 'Privacy settings updated successfully',
            'data' => $request->all(),
        ]);
    }

    /**
     * Send chat message notification (for WebRTC integration)
     */
    public function sendChatMessageNotification(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'appointment_id' => 'required|integer',
            'sender_id' => 'required|integer',
            'recipient_id' => 'required|integer',
            'message' => 'required|string',
            'message_id' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $appointmentId = $request->appointment_id;
            $senderId = $request->sender_id;
            $recipientId = $request->recipient_id;
            $message = $request->message;
            $messageId = $request->message_id;

            // Get sender and recipient
            $sender = User::find($senderId);
            $recipient = User::find($recipientId);

            if (!$sender || !$recipient) {
                return response()->json([
                    'success' => false,
                    'message' => 'Sender or recipient not found',
                ], 404);
            }

            // Get appointment
            $appointment = Appointment::find($appointmentId);
            if (!$appointment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Appointment not found',
                ], 404);
            }

            // Send notification
            $notification = new \App\Notifications\ChatMessageNotification(
                $sender, 
                $appointment, 
                $message, 
                $messageId
            );
            
            $recipient->notify($notification);

            return response()->json([
                'success' => true,
                'message' => 'Chat message notification sent successfully',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to send notification: ' . $e->getMessage(),
            ], 500);
        }
    }
}
