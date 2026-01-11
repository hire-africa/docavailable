<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Debug and env-test routes removed for security
// require_once __DIR__ . '/debug.php';
// require_once __DIR__ . '/env-test.php';
use App\Http\Controllers\Auth\AuthenticationController;
use App\Http\Controllers\Users\UserController;
use App\Http\Controllers\Users\ReviewController;
use App\Http\Controllers\Users\AppointmentController;
use App\Http\Controllers\Users\WorkingHoursController;
use App\Http\Controllers\FileUploadController;
use App\Http\Controllers\Admin\AdminController;
use App\Http\Controllers\Admin\PerformanceController;
use App\Http\Controllers\DoctorWalletController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\TimezoneController;
use App\Http\Controllers\DoctorController;
use App\Http\Controllers\EncryptionController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\TextSessionController;
use App\Http\Controllers\TextAppointmentController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\BlogFeedController;
use App\Models\User;
use App\Notifications\ChatMessageNotification;
use Illuminate\Support\Facades\DB;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

Route::get('/debug/apt32', function () {
    $apt = \App\Models\Appointment::find(32);
    if (!$apt)
        return ['error' => 'not found'];

    // Calculate what UTC should be
    $localDateTime = \Carbon\Carbon::parse($apt->appointment_date . ' ' . $apt->appointment_time, $apt->user_timezone ?: 'UTC');
    $calculatedUtc = $localDateTime->utc();

    // Force update
    $apt->appointment_datetime_utc = $calculatedUtc;
    $apt->saveQuietly(); // Skip model events to avoid double-calculation

    \Illuminate\Support\Facades\Artisan::call('appointments:activate-booked');
    $output = \Illuminate\Support\Facades\Artisan::output();

    $apt->refresh();
    return [
        'now_utc' => now('UTC')->toDateTimeString(),
        'input' => $apt->appointment_date . ' ' . $apt->appointment_time . ' (' . $apt->user_timezone . ')',
        'calculated_utc' => $calculatedUtc->toDateTimeString(),
        'stored_utc' => $apt->appointment_datetime_utc,
        'status' => $apt->status,
        'output' => $output
    ];
});


// Authentication routes (rate limited)
Route::prefix('auth')->middleware('throttle:5,1')->group(function () {
    Route::post('/register', [AuthenticationController::class, 'register']);
    Route::post('/login', [AuthenticationController::class, 'login']);
    Route::post('/google-login', [AuthenticationController::class, 'googleLogin'])->withoutMiddleware(['auth:sanctum', 'auth:api']);
    Route::post('/send-verification-code', [AuthenticationController::class, 'sendVerificationCode']);
    Route::post('/verify-email', [AuthenticationController::class, 'verifyEmail']);

    // Phone Authentication
    Route::post('/send-otp', [\App\Http\Controllers\Auth\PhoneAuthController::class, 'sendOtp']);
    Route::post('/verify-otp', [\App\Http\Controllers\Auth\PhoneAuthController::class, 'verifyOtp']);

});

// Simple user check endpoint
Route::post('/check-user-exists', [AuthenticationController::class, 'checkUserExists'])->middleware('throttle:30,1');

// Find user by email for Google authentication
Route::post('/find-user-by-email', [AuthenticationController::class, 'findUserByEmail'])->middleware('throttle:30,1');

// Backward compatibility routes for mobile app
Route::post('/login', [AuthenticationController::class, 'login'])->middleware('throttle:5,1');
Route::post('/register', [AuthenticationController::class, 'register'])->middleware('throttle:5,1');



// Password reset routes
Route::post('/forgot-password', [\App\Http\Controllers\Auth\PasswordResetLinkController::class, 'store'])->middleware('throttle:5,1');
Route::post('/reset-password', [\App\Http\Controllers\Auth\NewPasswordController::class, 'store'])->middleware('throttle:5,1');

// Code-based password reset routes
Route::post('/verify-reset-code', [\App\Http\Controllers\Auth\PasswordResetCodeController::class, 'verifyCode'])->middleware('throttle:5,1');
Route::post('/reset-password-with-code', [\App\Http\Controllers\Auth\PasswordResetCodeController::class, 'resetPassword'])->middleware('throttle:5,1');

// Public plans routes
Route::get('/plans/public', [\App\Http\Controllers\PlanController::class, 'getAllPlans']);
Route::get('/plans/pricing', [\App\Http\Controllers\PlanController::class, 'getPricingForCountry']);

// Protected routes (require JWT authentication)
Route::middleware(['auth:api'])->group(function () {
    // Auth routes
    Route::get('/user', [AuthenticationController::class, 'user']);
    Route::post('/logout', [AuthenticationController::class, 'logout']);
    Route::post('/refresh', [AuthenticationController::class, 'refresh']);
    Route::patch('/profile', [AuthenticationController::class, 'updateProfile']);
    Route::get('/private-document-url', [AuthenticationController::class, 'getPrivateDocumentUrl']);
    Route::post('/change-password', [AuthenticationController::class, 'changePassword']);

    // User & Subscription routes
    Route::get('/subscription', [UserController::class, 'subscription']);
    Route::patch('/update_subscription', [UserController::class, 'update_subscription']);
    Route::get('/users/{id}', [UserController::class, 'getUserById']);
    Route::get('/subscriptions/patient/{patientId}', [UserController::class, 'getPatientSubscription']);

    // Review routes
    Route::get('/reviews', [ReviewController::class, 'reviews']);
    Route::post('/create_review', [ReviewController::class, 'create_review']);
    Route::patch('/update_review', [ReviewController::class, 'update_review']);
    Route::delete('/reviews/{id}', [ReviewController::class, 'delete_review']);

    // Appointment routes
    Route::get('/appointments', [AppointmentController::class, 'appointments']);
    Route::post('/appointments', [AppointmentController::class, 'create_appointment']);
    Route::patch('/appointments/{id}', [AppointmentController::class, 'update_appointment']);
    Route::delete('/appointments/{id}', [AppointmentController::class, 'cancel_appointment']);
    Route::get('/available-doctors', [AppointmentController::class, 'available_doctors']);
    Route::get('/appointments/{id}', [AppointmentController::class, 'getAppointmentById']);
    Route::post('/appointments/{id}/start-session', [AppointmentController::class, 'startSession']);
    Route::post('/appointments/{id}/end-session', [AppointmentController::class, 'endSession']);
    Route::post('/appointments/{id}/process-payment', [AppointmentController::class, 'processPayment']);

    // Appointment statistics routes
    Route::get('/appointments/statistics/monthly', [AppointmentController::class, 'getMonthlyStatistics']);
    Route::get('/appointments/statistics/weekly', [AppointmentController::class, 'getWeeklyStatistics']);

    // Reschedule routes
    Route::post('/appointments/{id}/propose-reschedule', [AppointmentController::class, 'propose_reschedule']);
    Route::post('/appointments/{id}/respond-reschedule', [AppointmentController::class, 'respond_to_reschedule']);
    Route::get('/pending-reschedules', [AppointmentController::class, 'pending_reschedules']);
    Route::get('/doctor/reschedule-proposals', [AppointmentController::class, 'doctor_reschedule_proposals']);
    Route::delete('/appointments/{id}/cancel-reschedule', [AppointmentController::class, 'cancel_reschedule_proposal']);

    // Working hours routes
    Route::get('/working-hours', [WorkingHoursController::class, 'workinghours']);
    Route::post('/working-hours', [WorkingHoursController::class, 'create_workinghours']);
    Route::patch('/working-hours/{id}', [WorkingHoursController::class, 'update_workinghours']);
    Route::delete('/working-hours/{id}', [WorkingHoursController::class, 'delete_workinghours']);

    // Plan routes
    Route::get('/plans', [\App\Http\Controllers\PlanController::class, 'getPlansForUser']);
    Route::get('/plans/all', [\App\Http\Controllers\PlanController::class, 'getAllPlans']);
    Route::get('/plans/pricing', [\App\Http\Controllers\PlanController::class, 'getPricingForCountry']);
    Route::get('/plans/currency-info', [\App\Http\Controllers\PlanController::class, 'getCurrencyInfo']);






    // File/Image upload routes
    Route::post('/upload/profile-picture', [FileUploadController::class, 'uploadProfilePicture']);
    Route::post('/upload/id-document', [FileUploadController::class, 'uploadIdDocument']);
    Route::post('/upload/chat-image', [FileUploadController::class, 'uploadChatImage']);
    Route::post('/upload/chat-attachment', [FileUploadController::class, 'uploadChatAttachment']);
    Route::post('/upload/voice-message', [FileUploadController::class, 'uploadVoiceMessage']);

    // Audio file serving route (no auth required for streaming)
    Route::get('/audio/{path}', [FileUploadController::class, 'serveAudioFile'])->where('path', '.*')->withoutMiddleware(['auth:api']);

    // Image file serving route (no auth required for images)
    Route::get('/images/{path}', [FileUploadController::class, 'serveImageFile'])->where('path', '.*')->withoutMiddleware(['auth:api']);
    Route::post('/user/push-token', [UserController::class, 'updatePushToken']);
    Route::post('/user/active-status', [UserController::class, 'setActiveStatus']);

    // Online status routes
    Route::get('/users/{userId}/online-status', [UserController::class, 'getOnlineStatus']);
    Route::post('/users/online-status', [UserController::class, 'updateOnlineStatus']);
    Route::post('/users/{userId}/set-online', [UserController::class, 'setUserOnline']); // Test endpoint

    // Notification routes
    Route::get('/notifications', [NotificationController::class, 'getNotifications']);
    Route::post('/notifications/mark-read', [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/mark-all-read', [NotificationController::class, 'markAllAsRead']);
    Route::post('/notifications/send-chat-message', [NotificationController::class, 'sendChatMessageNotification']);
    Route::get('/notifications/preferences', [NotificationController::class, 'getPreferences']);
    Route::patch('/notifications/preferences', [NotificationController::class, 'updatePreferences']);
    Route::post('/notifications/push-token', [NotificationController::class, 'updatePushToken']);
    Route::delete('/notifications/push-token', [NotificationController::class, 'removePushToken']);
    Route::get('/notifications/stats', [NotificationController::class, 'getStats']);
    Route::delete('/notifications/{id}', [NotificationController::class, 'deleteNotification']);

    // User notification settings (frontend expects this structure)
    Route::get('/user/notification-settings', [NotificationController::class, 'getNotificationSettings']);
    Route::patch('/user/notification-settings', [NotificationController::class, 'updateNotificationSettings']);

    // User privacy settings (frontend expects this structure)
    Route::get('/user/privacy-settings', [NotificationController::class, 'getPrivacySettings']);
    Route::patch('/user/privacy-settings', [NotificationController::class, 'updatePrivacySettings']);

    // Timezone detection routes
    Route::get('/user/timezone-from-ip', [TimezoneController::class, 'getTimezoneFromIP']);
    Route::post('/user/timezone-from-coordinates', [TimezoneController::class, 'getTimezoneFromCoordinates']);
    Route::get('/user/common-timezones', [TimezoneController::class, 'getCommonTimezones']);

    // Chat routes
    Route::get('/chat/{appointmentId}/messages', [ChatController::class, 'getMessages']);
    Route::post('/chat/{appointmentId}/messages', [ChatController::class, 'sendMessage']);
    Route::delete('/chat/{appointmentId}/clear', [ChatController::class, 'clearMessages']);
    Route::get('/chat/{appointmentId}/info', [ChatController::class, 'getChatInfo']);

    // Local storage sync routes
    Route::get('/chat/{appointmentId}/local-storage', [ChatController::class, 'getMessagesForLocalStorage']);
    Route::post('/chat/{appointmentId}/sync', [ChatController::class, 'syncFromLocalStorage']);

    // Message reaction routes
    Route::post('/chat/{appointmentId}/messages/{messageId}/reactions', [ChatController::class, 'addReaction']);
    Route::delete('/chat/{appointmentId}/messages/{messageId}/reactions', [ChatController::class, 'removeReaction']);

    // Read receipts route
    Route::post('/chat/{appointmentId}/mark-read', [ChatController::class, 'markAsRead']);
    Route::post('/chat/{appointmentId}/fix-delivery-status', [ChatController::class, 'fixDeliveryStatus']);

    // Typing indicator routes
    Route::post('/chat/{appointmentId}/typing/start', [ChatController::class, 'startTyping']);
    Route::post('/chat/{appointmentId}/typing/stop', [ChatController::class, 'stopTyping']);
    Route::get('/chat/{appointmentId}/typing', [ChatController::class, 'getTypingUsers']);

    // Reply routes
    Route::post('/chat/{appointmentId}/messages/{messageId}/reply', [ChatController::class, 'replyToMessage']);

    // Encryption routes
    Route::post('/encryption/generate-keys', [EncryptionController::class, 'generateKeys']);
    Route::get('/encryption/status', [EncryptionController::class, 'getEncryptionStatus']);
    Route::post('/encryption/rooms/{roomId}/enable', [EncryptionController::class, 'enableRoomEncryption']);
    Route::get('/encryption/rooms/{roomId}/status', [EncryptionController::class, 'getRoomEncryptionStatus']);
    Route::get('/encryption/rooms/{roomId}/key', [EncryptionController::class, 'getRoomKey']);
    Route::post('/encryption/messages/{messageId}/decrypt', [EncryptionController::class, 'decryptMessage']);

    // Doctor rating routes
    Route::post('/doctor-ratings/{doctorId}/{patientId}', [ReviewController::class, 'createDoctorRating']);
    Route::get('/doctor-ratings/check-rated/{chatId}/{patientId}', [ReviewController::class, 'checkIfRated']);

    // Doctor availability routes (accessible to all authenticated users)
    Route::get('/doctors/{id}/availability', [DoctorController::class, 'getAvailability']);
    Route::put('/doctors/{id}/availability', [DoctorController::class, 'updateAvailability']);

    // Text session routes
    // Unified Text Session Routes
    Route::post('/text-sessions/schedule', [TextSessionController::class, 'createScheduled']);
    Route::get('/text-sessions/scheduled', [TextSessionController::class, 'getScheduledSessions']);

    Route::post('/text-sessions/start', [TextSessionController::class, 'start']);
    Route::post('/text-sessions/create-from-appointment', [TextSessionController::class, 'createFromAppointment']);
    Route::get('/text-sessions/pending-sessions', [TextSessionController::class, 'pendingSessions']);
    Route::get('/text-sessions/active-sessions', [TextSessionController::class, 'activeSessions']);
    Route::get('/text-sessions/available-doctors', [TextSessionController::class, 'availableDoctors']);
    Route::get('/text-sessions/{manualSessionId}/check-response', [TextSessionController::class, 'checkResponse'])->where('manualSessionId', '[0-9]+');
    Route::post('/text-sessions/{manualSessionId}/end', [TextSessionController::class, 'endSession'])->where('manualSessionId', '[0-9]+');
    Route::get('/text-sessions/{manualSessionId}', [TextSessionController::class, 'getSession'])->where('manualSessionId', '[0-9]+');

    // Text appointment session routes
    Route::post('/text-appointments/start-session', [TextAppointmentController::class, 'startSession']);
    Route::post('/text-appointments/update-activity', [TextAppointmentController::class, 'updateActivity']);
    Route::post('/text-appointments/process-deduction', [TextAppointmentController::class, 'processDeduction']);
    Route::post('/text-appointments/end-session', [TextAppointmentController::class, 'endSession']);
    Route::get('/text-appointments/{appointmentId}/session-status', [TextAppointmentController::class, 'getSessionStatus']);

    // Call session routes
    Route::post('/call-sessions/check-availability', [App\Http\Controllers\CallSessionController::class, 'checkAvailability']);
    Route::post('/call-sessions/start', [App\Http\Controllers\CallSessionController::class, 'start']);
    Route::post('/call-sessions/mark-connected', [App\Http\Controllers\CallSessionController::class, 'markConnected']);
    Route::post('/call-sessions/end', [App\Http\Controllers\CallSessionController::class, 'end']);
    Route::post('/call-sessions/deduction', [App\Http\Controllers\CallSessionController::class, 'deduction']);
    Route::post('/call-sessions/re-notify', [App\Http\Controllers\CallSessionController::class, 'reNotify']);
    Route::post('/call-sessions/answer', [App\Http\Controllers\CallSessionController::class, 'answer']);

    // TEMPORARY DEBUG ENDPOINT - DISABLED FOR SECURITY
    // Route::get('/debug-call/{appointmentId}', function ($appointmentId) {
    //     return \App\Models\CallSession::where('appointment_id', $appointmentId)->get();
    // });
    // Route::post('/call-sessions/decline', [App\Http\Controllers\CallSessionController::class, 'decline']);
    Route::post('/call-sessions/decline', [App\Http\Controllers\CallSessionController::class, 'decline']);

    // Debug: Tail laravel.log (last 200 lines) - DISABLED FOR SECURITY
    /*
    Route::get('/debug/log-tail', function () {
        try {
            $path = storage_path('logs/laravel.log');
            if (!file_exists($path)) {
                return response()->json(['success' => false, 'message' => 'laravel.log not found']);
            }
            $lines = @file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
            $tail = array_slice($lines, -200);
            return response()->json(['success' => true, 'data' => $tail]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()]);
        }
    });
    */

    // Debug: Clear Cache (Force remote update) - DISABLED FOR SECURITY
    /*
    Route::get('/debug/clear-cache', function () {
        try {
            \Illuminate\Support\Facades\Artisan::call('optimize:clear');
            return response()->json(['success' => true, 'message' => 'Cache cleared successfully (optimize:clear)']);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()]);
        }
    });
    */

    // Debug: Show masked doctor push token and flags - DISABLED FOR SECURITY
    /*
    Route::get('/debug/doctor-token', function (\Illuminate\Http\Request $request) {
        $doctorId = (int) $request->query('doctor_id', 2);
        $user = \App\Models\User::find($doctorId);
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Doctor not found'], 404);
        }
        $token = (string) ($user->push_token ?? '');
        $masked = $token ? (substr($token, 0, 12) . '...' . substr($token, -8)) : '';
        return response()->json([
            'success' => true,
            'data' => [
                'doctor_id' => $doctorId,
                'push_notifications_enabled' => (bool) $user->push_notifications_enabled,
                'has_push_token' => !empty($token),
                'push_token_preview' => $masked,
                'token_length' => strlen($token),
            ]
        ]);
    });
    */

});

// Public debug endpoints (guarded by shared secret) - DISABLED FOR SECURITY
/*
Route::get('/public-debug/log-tail', function (Request $request) {
    $key = (string) $request->query('key', '');
    $secret = env('PUBLIC_DEBUG_KEY', 'docdebug');
    if ($key !== $secret) {
        return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
    }
    try {
        $path = storage_path('logs/laravel.log');
        if (!file_exists($path)) {
            return response()->json(['success' => false, 'message' => 'laravel.log not found']);
        }
        $lines = @file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
        $tail = array_slice($lines, -200);
        return response()->json(['success' => true, 'data' => $tail]);
    } catch (\Throwable $t) {
        return response()->json(['success' => false, 'error' => $t->getMessage()], 500);
    }
});

Route::get('/public-debug/doctor-token', function (Request $request) {
    $key = (string) $request->query('key', '');
    $secret = env('PUBLIC_DEBUG_KEY', 'docdebug');
    if ($key !== $secret) {
        return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
    }
    $doctorId = (int) $request->query('doctor_id', 2);
    $user = \App\Models\User::find($doctorId);
    if (!$user) {
        return response()->json(['success' => false, 'message' => 'Doctor not found'], 404);
    }
    $token = (string) ($user->push_token ?? '');
    $masked = $token ? (substr($token, 0, 12) . '...' . substr($token, -8)) : '';
    return response()->json([
        'success' => true,
        'data' => [
            'doctor_id' => $doctorId,
            'push_notifications_enabled' => (bool) $user->push_notifications_enabled,
            'has_push_token' => !empty($token),
            'push_token_preview' => $masked,
            'token_length' => strlen($token),
        ]
    ]);
});
*/

// Public chatbot routes (no authentication required)
Route::post('/chatbot/response', [App\Http\Controllers\ChatbotController::class, 'getResponse']);
Route::post('/chatbot/streaming', [App\Http\Controllers\ChatbotController::class, 'getStreamingResponse']);
Route::get('/chatbot/test-config', [App\Http\Controllers\ChatbotController::class, 'testConfig']);
// Route::get('/chatbot/test-openai', function () {
//     $apiKey = env('OPENAI_API_KEY');
// 
//     if (empty($apiKey)) {
//         return response()->json(['error' => 'No API key found']);
//     }
// 
//     // Clean the API key - remove any whitespace or hidden characters
//     $apiKey = trim($apiKey);
// 
//     return response()->json([
//         'api_key_length' => strlen($apiKey),
//         'api_key_starts_with_sk' => str_starts_with($apiKey, 'sk-'),
//         'api_key_ends_with' => substr($apiKey, -10),
//         'api_key_has_spaces' => str_contains($apiKey, ' '),
//         'api_key_has_newlines' => str_contains($apiKey, "\n"),
//         'api_key_has_tabs' => str_contains($apiKey, "\t"),
//         'raw_length' => strlen(env('OPENAI_API_KEY')),
//     ]);
// });
// 
// Route::get('/chatbot/test-simple-openai', function () {
//     $apiKey = trim(env('OPENAI_API_KEY'));
// 
//     try {
//         // Try with a simpler model first
//         $response = Http::withHeaders([
//             'Authorization' => 'Bearer ' . $apiKey,
//             'Content-Type' => 'application/json',
//         ])->timeout(30)->post('https://api.openai.com/v1/models');
// 
//         return response()->json([
//             'status' => $response->status(),
//             'success' => $response->successful(),
//             'body' => $response->body(),
//             'api_key_preview' => substr($apiKey, 0, 20) . '...' . substr($apiKey, -10),
//         ]);
//     } catch (\Exception $e) {
//         return response()->json(['error' => $e->getMessage()]);
//     }
// });

// Debug endpoint to check environment variables - DISABLED FOR SECURITY
/*
Route::get('/chatbot/debug', function () {
    return response()->json([
        'openai_key_exists' => !empty(env('OPENAI_API_KEY')),
        'openai_key_length' => env('OPENAI_API_KEY') ? strlen(env('OPENAI_API_KEY')) : 0,
        'openai_key_starts_with_sk' => env('OPENAI_API_KEY') ? str_starts_with(env('OPENAI_API_KEY'), 'sk-') : false,
        'openai_key_preview' => env('OPENAI_API_KEY') ? substr(env('OPENAI_API_KEY'), 0, 10) . '...' : 'not set',
        'app_env' => env('APP_ENV'),
        'app_debug' => env('APP_DEBUG')
    ]);
});
*/

// Debug endpoint to check user country information - DISABLED FOR SECURITY
/*
Route::middleware(['auth:api'])->get('/debug/user-country', function () {
    $user = Auth::user();
    return response()->json([
        'user_id' => $user->id,
        'user_country' => $user->country,
        'user_country_lowercase' => strtolower($user->country ?? ''),
        'is_malawi_user' => strtolower($user->country ?? '') === 'malawi',
        'user_type' => $user->user_type,
        'email' => $user->email
    ]);
});
*/

// Public upload routes (for registration process - no auth required)
Route::post('/upload/profile-picture-public', [FileUploadController::class, 'uploadProfilePicturePublic']);

// Admin routes (admin only)
Route::middleware(['auth:api', 'role:admin'])->group(function () {
    Route::get('/admin/users', [AdminController::class, 'getAllUsers']);
    Route::get('/admin/appointments', [AdminController::class, 'getAllAppointments']);
    Route::patch('/admin/users/{userId}/role', [AdminController::class, 'updateUserRole']);
    Route::get('/admin/dashboard-stats', [AdminController::class, 'getDashboardStats']);

    // Doctor approval routes
    Route::get('/admin/doctors/pending', [AdminController::class, 'getPendingDoctors']);
    Route::get('/admin/doctors/{doctorId}', [AdminController::class, 'getDoctorDetails']);
    Route::post('/admin/doctors/{doctorId}/approve', [AdminController::class, 'approveDoctor']);
    Route::post('/admin/doctors/{doctorId}/reject', [AdminController::class, 'rejectDoctor']);

    // Withdrawal request management routes
    Route::get('/admin/withdrawal-requests', [\App\Http\Controllers\Admin\WithdrawalRequestController::class, 'index']);
    Route::get('/admin/withdrawal-requests/stats', [\App\Http\Controllers\Admin\WithdrawalRequestController::class, 'getStats']);
    Route::get('/admin/withdrawal-requests/{id}', [\App\Http\Controllers\Admin\WithdrawalRequestController::class, 'show']);
    Route::post('/admin/withdrawal-requests/{id}/approve', [\App\Http\Controllers\Admin\WithdrawalRequestController::class, 'approve']);
    Route::post('/admin/withdrawal-requests/{id}/reject', [\App\Http\Controllers\Admin\WithdrawalRequestController::class, 'reject']);
    Route::post('/admin/withdrawal-requests/{id}/mark-as-paid', [\App\Http\Controllers\Admin\WithdrawalRequestController::class, 'markAsPaid']);
    Route::post('/admin/withdrawal-requests/send-completion-email', [\App\Http\Controllers\Admin\WithdrawalRequestController::class, 'sendWithdrawalCompletedEmail']);

    // Plan management
    Route::get('/admin/plans', [\App\Http\Controllers\Admin\PlanController::class, 'index']);
    Route::post('/admin/plans', [\App\Http\Controllers\Admin\PlanController::class, 'store']);
    Route::patch('/admin/plans/{id}', [\App\Http\Controllers\Admin\PlanController::class, 'update']);
    Route::delete('/admin/plans/{id}', [\App\Http\Controllers\Admin\PlanController::class, 'destroy']);
    Route::post('/admin/users', [AdminController::class, 'createUser']);
    Route::patch('/admin/users/{userId}', [AdminController::class, 'updateUser']);
    Route::delete('/admin/users/{userId}', [AdminController::class, 'deleteUser']);

    // Performance monitoring routes
    Route::get('/admin/performance/overall-stats', [PerformanceController::class, 'getOverallStats']);
    Route::get('/admin/performance/endpoint-stats', [PerformanceController::class, 'getEndpointStats']);
    Route::get('/admin/performance/slowest-endpoints', [PerformanceController::class, 'getSlowestEndpoints']);
    Route::get('/admin/performance/cache-stats', [PerformanceController::class, 'getCacheStats']);
    Route::get('/admin/performance/database-stats', [PerformanceController::class, 'getDatabaseStats']);
    Route::get('/admin/performance/system-stats', [PerformanceController::class, 'getSystemStats']);
    Route::get('/admin/performance/queue-stats', [PerformanceController::class, 'getQueueStats']);
    Route::post('/admin/performance/clear-cache', [PerformanceController::class, 'clearPerformanceCache']);
});

// Doctor routes (doctor only)
Route::middleware(['auth:api', 'role:doctor'])->group(function () {
    Route::get('/doctor/appointments', [AppointmentController::class, 'doctorAppointments']);
    Route::patch('/doctor/appointments/{id}/status', [AppointmentController::class, 'updateAppointmentStatus']);
    Route::delete('/doctor/appointments/{id}', [AppointmentController::class, 'deleteExpiredAppointment']);
    Route::get('/doctor/patients', [AppointmentController::class, 'doctorPatients']);

    // Doctor wallet routes
    Route::get('/doctor/wallet', [DoctorWalletController::class, 'getWallet']);
    Route::get('/doctor/wallet/transactions', [DoctorWalletController::class, 'getTransactions']);
    Route::get('/doctor/wallet/earnings-summary', [DoctorWalletController::class, 'getEarningsSummary']);
    Route::post('/doctor/wallet/withdraw', [DoctorWalletController::class, 'requestWithdrawal']);
    Route::get('/doctor/wallet/withdrawal-requests', [DoctorWalletController::class, 'getWithdrawalRequests']);
    Route::get('/doctor/wallet/payment-rates', [DoctorWalletController::class, 'getPaymentRates']);

});

// Patient routes (patient only)
Route::middleware(['auth:api', 'role:patient'])->group(function () {
    Route::get('/patient/appointments', [AppointmentController::class, 'patientAppointments']);
    Route::post('/patient/appointments', [AppointmentController::class, 'bookAppointment']);
    Route::delete('/patient/appointments/{id}', [AppointmentController::class, 'cancelAppointment']);
});

// Public routes (no auth required)
Route::get('/doctors/active', [UserController::class, 'getActiveDoctors']);
Route::get('/doctors/{id}/working-hours', [WorkingHoursController::class, 'doctor_working_hours']);
Route::get('/doctors/{id}/reviews', [ReviewController::class, 'doctor_reviews']);
Route::get('/blog/feed', [BlogFeedController::class, 'feed']);

// Doctor routes
Route::prefix('doctors')->group(function () {
    Route::get('/', [UserController::class, 'getActiveDoctors']); // List all doctors
    Route::get('specializations', [DoctorController::class, 'getSpecializations']);
    Route::get('by-specialization', [DoctorController::class, 'getDoctorsBySpecialization']);
    Route::get('{id}', [DoctorController::class, 'getDoctorDetails']);
});

/*
Route::get('/test-login', function () {
    return response()->json([
        'success' => true,
        'message' => 'Test endpoint working',
        'timestamp' => now()
    ]);
});

Route::post('/test-login-error-handling', function (Illuminate\Http\Request $request) {
    try {
        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            $errors = $validator->errors();
            $errorMessages = [];
            $detailedMessage = 'Please check your input and try again.';

            if ($errors->has('email')) {
                $errorMessages['email'] = 'Please enter a valid email address.';
                $detailedMessage = 'Please enter a valid email address in the format: example@domain.com';
            }

            if ($errors->has('password')) {
                $errorMessages['password'] = 'Password is required.';
                $detailedMessage = 'Password field cannot be empty. Please enter your password.';
            }

            if ($errors->has('email') && $errors->has('password')) {
                $detailedMessage = 'Please enter a valid email address and password.';
            }

            return response()->json([
                'success' => false,
                'message' => $detailedMessage,
                'errors' => $errorMessages,
                'error_type' => 'validation_error'
            ], 422);
        }

        $email = $request->input('email');
        $password = $request->input('password');

        // Check if user exists
        $user = \App\Models\User::where('email', $email)->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Email address not found. Please check your email or create a new account.',
                'error_type' => 'email_not_found',
                'suggestion' => 'If you don\'t have an account, please register first.'
            ], 401);
        }

        // Check if account is suspended
        if ($user->status === 'suspended') {
            return response()->json([
                'success' => false,
                'message' => 'Your account has been suspended. Please contact support for assistance.',
                'error_type' => 'account_suspended',
                'suggestion' => 'Contact our support team to reactivate your account.'
            ], 403);
        }

        // Check if account is pending approval (for doctors)
        if ($user->user_type === 'doctor' && $user->status === 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Your account is pending approval. Please wait for admin approval.',
                'error_type' => 'account_pending',
                'suggestion' => 'You will receive an email notification once your account is approved.'
            ], 403);
        }

        // For testing, always return invalid password
        return response()->json([
            'success' => false,
            'message' => 'Invalid password. Please check your password and try again.',
            'error_type' => 'invalid_password',
            'suggestion' => 'Make sure caps lock is off and try again. If you forgot your password, use the forgot password option.'
        ], 401);

    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'An unexpected error occurred during login. Please try again later.',
            'error_type' => 'unexpected_error',
            'suggestion' => 'If this problem persists, please contact support.',
            'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
        ], 500);
    }
});
*/

// OneSignal Test Endpoints - DISABLED FOR SECURITY
/*
Route::get('/test-env', function () {
    return response()->json([
        'fcm_project_id' => config('services.fcm.project_id'),
        'service_account_exists' => file_exists(storage_path('app/firebase-service-account.json')),
        'notification_channel' => 'fcm'
    ]);
});

Route::post('/test-notification', function (Request $request) {
    $user = null;
    if ($request->has('user_id') && $request->user_id) {
        $user = User::find($request->user_id);
    }
    if (!$user && $request->has('email') && $request->email) {
        $user = User::where('email', $request->email)->first();
    }
    if (!$user) {
        return response()->json(['error' => 'User not found'], 404);
    }

    // Create a test appointment for the notification
    $testAppointment = new \App\Models\Appointment();
    $testAppointment->id = 'test-appointment-' . time();
    $testAppointment->appointment_date = now();

    // Create a test sender user
    $testSender = new User();
    $testSender->id = 999;
    $testSender->first_name = 'Test';
    $testSender->last_name = 'Sender';
    $testSender->role = 'doctor';

    $user->notify(new ChatMessageNotification(
        $testSender,
        $testAppointment,
        $request->message,
        'test-message-' . time()
    ));

    return response()->json([
        'message' => 'Test notification sent',
        'user_id' => $user->id,
        'user_email' => $user->email,
        'has_push_token' => !empty($user->push_token),
        'push_notifications_enabled' => $user->push_notifications_enabled
    ]);
});

// New: Test notification by email (FCM)
Route::post('/test-notification-by-email', function (Illuminate\Http\Request $request) {
    $email = $request->input('email');
    if (!$email) {
        return response()->json(['error' => 'Email is required'], 422);
    }

    $user = \App\Models\User::where('email', $email)->first();
    if (!$user) {
        return response()->json(['error' => 'User not found by email'], 404);
    }

    // Create a test appointment for the notification
    $testAppointment = new \App\Models\Appointment();
    $testAppointment->id = 'test-appointment-' . time();
    $testAppointment->appointment_date = now();

    // Create a test sender user
    $testSender = new \App\Models\User();
    $testSender->id = 999;
    $testSender->first_name = 'Test';
    $testSender->last_name = 'Sender';
    $testSender->role = 'doctor';

    $message = $request->input('message', 'Test FCM notification');

    $user->notify(new \App\Notifications\ChatMessageNotification(
        $testSender,
        $testAppointment,
        $message,
        'test-message-' . time()
    ));

    return response()->json([
        'message' => 'Test notification (by email) dispatched',
        'user_id' => $user->id,
        'user_email' => $user->email,
        'has_push_token' => !empty($user->push_token),
        'push_notifications_enabled' => $user->push_notifications_enabled
    ]);
});
*/

// Payment routes (no auth required for webhooks)
Route::post('/payments/webhook', [PaymentController::class, 'webhook'])->withoutMiddleware(['auth:sanctum']);
Route::get('/payments/status', [PaymentController::class, 'checkStatus'])->withoutMiddleware(['auth:sanctum']);

// PayChangu Standard Checkout
Route::middleware(['auth:api'])->group(function () {
    Route::post('/payments/paychangu/initiate', [PaymentController::class, 'initiate']);
});
Route::get('/paychangu/callback', [PaymentController::class, 'callback'])->withoutMiddleware(['auth:sanctum', 'auth:api']);
Route::get('/paychangu/return', [PaymentController::class, 'returnHandler'])->withoutMiddleware(['auth:sanctum', 'auth:api']);

// OAuth Callback Route (moved to api.php for proper routing)
Route::get('/oauth/callback', function (Request $request) {
    try {
        $code = $request->query('code');
        $error = $request->query('error');

        if ($error) {
            return response()->json([
                'success' => false,
                'error' => $error,
                'error_description' => $request->query('error_description', 'Unknown error')
            ], 400);
        }

        if (!$code) {
            return response()->json([
                'success' => false,
                'error' => 'missing_code',
                'error_description' => 'Authorization code not provided'
            ], 400);
        }

        // Return JSON response with the code for frontend to process
        return response()->json([
            'success' => true,
            'code' => $code,
            'state' => $request->query('state', '')
        ]);

    } catch (\Exception $e) {
        \Log::error('OAuth callback error', [
            'error' => $e->getMessage(),
            'request' => $request->all()
        ]);

        return response()->json([
            'success' => false,
            'error' => 'server_error',
            'error_description' => 'An error occurred processing the OAuth callback'
        ], 500);
    }
})->withoutMiddleware(['auth:sanctum', 'auth:api']);


// OAuth Code Exchange Route
Route::post('/oauth/exchange-code', function (Request $request) {
    try {
        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'code' => 'required|string',
            'redirect_uri' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid request parameters',
                'errors' => $validator->errors()
            ], 422);
        }

        $code = $request->input('code');
        $redirectUri = $request->input('redirect_uri');

        // Google OAuth configuration
        $clientId = env('GOOGLE_CLIENT_ID', '449082896435-ge0pijdnl6j3e0c9jjclnl7tglmh45ml.apps.googleusercontent.com');
        $clientSecret = env('GOOGLE_CLIENT_SECRET', '');

        if (!$clientSecret) {
            return response()->json([
                'success' => false,
                'message' => 'Google OAuth not configured properly'
            ], 500);
        }

        // Exchange authorization code for tokens
        $tokenUrl = 'https://oauth2.googleapis.com/token';
        $tokenData = [
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'code' => $code,
            'grant_type' => 'authorization_code',
            'redirect_uri' => $redirectUri,
        ];

        $response = \Illuminate\Support\Facades\Http::asForm()->post($tokenUrl, $tokenData);

        if (!$response->successful()) {
            \Log::error('Google token exchange failed', [
                'status' => $response->status(),
                'body' => $response->body()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to exchange authorization code with Google'
            ], 400);
        }

        $tokenResponse = $response->json();

        if (!isset($tokenResponse['id_token'])) {
            return response()->json([
                'success' => false,
                'message' => 'No ID token received from Google'
            ], 400);
        }

        return response()->json([
            'success' => true,
            'id_token' => $tokenResponse['id_token'],
            'access_token' => $tokenResponse['access_token'] ?? null,
            'refresh_token' => $tokenResponse['refresh_token'] ?? null,
        ]);

    } catch (\Exception $e) {
        \Log::error('OAuth code exchange error', [
            'error' => $e->getMessage(),
            'request' => $request->all()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'An error occurred during code exchange'
        ], 500);
    }
})->withoutMiddleware(['auth:sanctum', 'auth:api']);

// Manual queue processing endpoint (for testing and backup)
Route::post('/admin/process-queue', function () {
    try {
        $jobs = \Illuminate\Support\Facades\DB::table('jobs')->where('queue', 'text-sessions')->get();

        if ($jobs->count() === 0) {
            return response()->json([
                'success' => true,
                'message' => 'No pending jobs found',
                'processed' => 0
            ]);
        }

        $processedCount = 0;

        foreach ($jobs as $job) {
            try {
                $payload = json_decode($job->payload);
                $jobClass = $payload->displayName ?? 'Unknown';
                $jobData = $payload->data ?? [];

                if (strpos($jobClass, 'ProcessTextSessionAutoDeduction') !== false) {
                    $sessionId = $jobData->sessionId ?? null;
                    $expectedDeductionCount = $jobData->expectedDeductionCount ?? 1;

                    if ($sessionId) {
                        $autoDeductionJob = new \App\Jobs\ProcessTextSessionAutoDeduction($sessionId, $expectedDeductionCount);
                        $autoDeductionJob->handle();
                        $processedCount++;
                    }

                } elseif (strpos($jobClass, 'EndTextSession') !== false) {
                    $sessionId = $jobData->sessionId ?? null;
                    $reason = $jobData->reason ?? 'time_expired';

                    if ($sessionId) {
                        $autoEndJob = new \App\Jobs\EndTextSession($sessionId, $reason);
                        $autoEndJob->handle();
                        $processedCount++;
                    }
                }

                // Delete the processed job
                \Illuminate\Support\Facades\DB::table('jobs')->where('id', $job->id)->delete();

            } catch (Exception $e) {
                \Illuminate\Support\Facades\Log::error('Failed to process queue job: ' . $e->getMessage());
            }
        }

        return response()->json([
            'success' => true,
            'message' => "Processed {$processedCount} jobs",
            'processed' => $processedCount,
            'total_found' => $jobs->count()
        ]);

    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Failed to process queue: ' . $e->getMessage()
        ], 500);
    }
});