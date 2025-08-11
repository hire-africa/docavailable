<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
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
use App\Http\Controllers\DoctorController;
use App\Http\Controllers\EncryptionController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\TextSessionController;
use App\Http\Controllers\PaymentController;
use App\Models\User;
use App\Notifications\ChatMessageNotification;
use Illuminate\Support\Facades\DB;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Health check endpoint
Route::get('/health', function () {
    $health = [
        'status' => 'ok',
        'timestamp' => now()->toISOString(),
        'message' => 'Backend is running',
        'services' => []
    ];

    // Test database connection
    try {
        $dbConnection = DB::connection()->getPdo();
        $health['services']['database'] = [
            'status' => 'ok',
            'driver' => config('database.default'),
            'connected' => true,
            'name' => DB::connection()->getDatabaseName(),
            'host' => config('database.connections.' . config('database.default') . '.host'),
            'connection_name' => DB::connection()->getName()
        ];
    } catch (\Exception $e) {
        $health['services']['database'] = [
            'status' => 'error',
            'driver' => config('database.default'),
            'connected' => false,
            'error' => $e->getMessage(),
            'host' => config('database.connections.' . config('database.default') . '.host'),
            'connection_name' => config('database.default')
        ];
        $health['status'] = 'error';
    }

    // Test JWT configuration
    try {
        $user = \App\Models\User::first();
        if ($user) {
            $token = auth('api')->login($user);
            $health['services']['jwt'] = [
                'status' => 'ok',
                'secret_configured' => !empty(config('jwt.secret')),
                'token_generated' => !empty($token),
                'token_length' => strlen($token)
            ];
        } else {
            $health['services']['jwt'] = [
                'status' => 'warning',
                'message' => 'No users found in database',
                'secret_configured' => !empty(config('jwt.secret'))
            ];
        }
    } catch (\Exception $e) {
        $health['services']['jwt'] = [
            'status' => 'error',
            'error' => $e->getMessage(),
            'secret_configured' => !empty(config('jwt.secret'))
        ];
        $health['status'] = 'error';
    }

    // Test environment configuration
    $health['services']['environment'] = [
        'status' => 'ok',
        'app_env' => config('app.env'),
        'app_debug' => config('app.debug'),
        'db_connection' => config('database.default'),
        'db_host' => env('DB_HOST'),
        'db_url_set' => !empty(env('DB_URL')),
        'jwt_secret_set' => !empty(env('JWT_SECRET'))
    ];

    return response()->json($health, $health['status'] === 'ok' ? 200 : 500);
});

// Debug endpoint for testing chat
Route::get('/debug/chat-test', function () {
    return response()->json([
        'status' => 'ok',
        'message' => 'Chat debug endpoint working',
        'timestamp' => now()->toISOString(),
        'rate_limiting' => 'disabled',
        'auto_sync' => 'enabled'
    ]);
});

// Debug endpoint for testing doctor profile
Route::get('/debug/doctor-test', function () {
    try {
        $user = \App\Models\User::where('user_type', 'doctor')->first();
        if ($user) {
            return response()->json([
                'status' => 'ok',
                'message' => 'Doctor found',
                'doctor_id' => $user->id,
                'doctor_name' => $user->first_name . ' ' . $user->last_name,
                'doctor_status' => $user->status,
                'profile_picture' => $user->profile_picture
            ]);
        } else {
            return response()->json([
                'status' => 'error',
                'message' => 'No doctors found in database'
            ]);
        }
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'error',
            'message' => 'Error: ' . $e->getMessage()
        ]);
    }
});

// Test chat endpoints
Route::get('/debug/chat-endpoints', function () {
    return response()->json([
        'status' => 'ok',
        'endpoints' => [
            'POST /chat/{appointmentId}/messages' => 'Send message',
            'GET /chat/{appointmentId}/messages' => 'Get messages',
            'POST /chat/{appointmentId}/typing/start' => 'Start typing',
            'POST /chat/{appointmentId}/typing/stop' => 'Stop typing',
            'GET /chat/{appointmentId}/typing' => 'Get typing users'
        ],
        'timestamp' => now()->toISOString()
    ]);
});

// Health check endpoint (duplicate removed)

// Create first admin endpoint (no auth required, explicitly excluded from middleware)
Route::post('/create-first-admin', [AuthenticationController::class, 'createFirstAdmin'])->withoutMiddleware([\Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class]);

// Authentication routes (no auth required)
Route::post('/register', [AuthenticationController::class, 'register']);
Route::post('/login', [AuthenticationController::class, 'login']);
Route::post('/google-login', [AuthenticationController::class, 'googleLogin']);

// Password reset routes (no auth required) - temporarily without rate limiting for testing
Route::post('/forgot-password', [\App\Http\Controllers\Auth\PasswordResetLinkController::class, 'store'])->withoutMiddleware(['throttle']);
Route::post('/reset-password', [\App\Http\Controllers\Auth\NewPasswordController::class, 'store'])->withoutMiddleware(['throttle']);

// Create test user endpoint (for development/testing)
Route::post('/create-test-user', function () {
    try {
        // Check if user already exists
        $existingUser = \App\Models\User::where('email', 'test@docavailable.com')->first();
        
        if ($existingUser) {
            return response()->json([
                'success' => true,
                'message' => 'Test user already exists',
                'data' => [
                    'email' => $existingUser->email,
                    'password' => 'password123',
                    'user_type' => $existingUser->user_type,
                    'status' => $existingUser->status
                ]
            ]);
        }
        
        // Create new test user
        $user = \App\Models\User::create([
            'first_name' => 'Test',
            'last_name' => 'User',
            'email' => 'test@docavailable.com',
            'password' => \Illuminate\Support\Facades\Hash::make('password123'),
            'user_type' => 'patient',
            'status' => 'active',
            'display_name' => 'Test User',
            'rating' => 0,
            'total_ratings' => 0,
        ]);
        
        return response()->json([
            'success' => true,
            'message' => 'Test user created successfully',
            'data' => [
                'email' => $user->email,
                'password' => 'password123',
                'user_type' => $user->user_type,
                'status' => $user->status
            ]
        ]);
        
    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Error creating test user: ' . $e->getMessage()
        ], 500);
    }
});

// Development: View password reset links (only in local environment)
if (app()->environment('local')) {
    Route::get('/dev/password-reset-links', function () {
        $logFile = storage_path('logs/password_reset_links.log');
        if (File::exists($logFile)) {
            $lines = File::lines($logFile);
            $links = [];
            foreach ($lines as $line) {
                if (!empty(trim($line))) {
                    $links[] = json_decode($line, true);
                }
            }
            return response()->json([
                'message' => 'Latest password reset links (for development)',
                'links' => array_reverse($links) // Show newest first
            ]);
        }
        return response()->json(['message' => 'No password reset links found']);
    });
    

    
    // Test email configuration
    Route::get('/dev/test-email', function () {
        try {
            \Mail::raw('Test email from DocAvailable', function($message) {
                $message->to('Docavailable01@gmail.com')
                        ->subject('Test Email - DocAvailable');
            });
            return response()->json(['message' => 'Test email sent successfully']);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Email test failed: ' . $e->getMessage()], 500);
        }
    });
}

// Protected routes (require JWT authentication)
Route::middleware(['auth:api'])->group(function () {
    // Auth routes
    Route::get('/user', [AuthenticationController::class, 'user']);
    Route::post('/logout', [AuthenticationController::class, 'logout']);
    Route::post('/refresh', [AuthenticationController::class, 'refresh']);
    Route::patch('/profile', [AuthenticationController::class, 'updateProfile']);
    Route::post('/change-password', [AuthenticationController::class, 'changePassword']);
    
    // User & Subscription routes
    Route::get('/subscription', [UserController::class, 'subscription']);
    Route::post('/create_subscription', [UserController::class, 'create_subscription']);
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
    Route::post('/text-sessions/start', [TextSessionController::class, 'start']);
    Route::get('/text-sessions/active-sessions', [TextSessionController::class, 'activeSessions']);
    Route::get('/text-sessions/{sessionId}', [TextSessionController::class, 'getSession']);
    Route::post('/text-sessions/{sessionId}/end', [TextSessionController::class, 'endSession']);
    Route::get('/text-sessions/available-doctors', [TextSessionController::class, 'availableDoctors']);
});

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

// Doctor routes
Route::prefix('doctors')->group(function () {
    Route::get('specializations', [DoctorController::class, 'getSpecializations']);
    Route::get('by-specialization', [DoctorController::class, 'getDoctorsBySpecialization']);
    Route::get('{id}', [DoctorController::class, 'getDoctorDetails']);
});

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

// OneSignal Test Endpoints
Route::get('/test-env', function() {
    return response()->json([
        'onesignal_app_id' => config('services.onesignal.app_id'),
        'onesignal_rest_api_key' => config('services.onesignal.rest_api_key') ? 'configured' : 'missing',
        'notification_channel' => 'onesignal'
    ]);
});

Route::post('/test-notification', function(Request $request) {
    $user = User::find($request->user_id);
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

// Payment routes (no auth required for webhooks)
Route::post('/payments/webhook', [PaymentController::class, 'webhook'])->withoutMiddleware(['auth:sanctum']);
Route::get('/payments/status', [PaymentController::class, 'checkStatus'])->withoutMiddleware(['auth:sanctum']);
Route::post('/payments/test-webhook', [PaymentController::class, 'testWebhook'])->withoutMiddleware(['auth:sanctum']);
// PayChangu Standard Checkout
Route::middleware(['auth:api'])->group(function () {
    Route::post('/payments/paychangu/initiate', [PaymentController::class, 'initiate']);
});
Route::get('/payments/paychangu/callback', [PaymentController::class, 'callback'])->withoutMiddleware(['auth:sanctum', 'auth:api']);
Route::get('/payments/paychangu/return', [PaymentController::class, 'returnHandler'])->withoutMiddleware(['auth:sanctum', 'auth:api']);