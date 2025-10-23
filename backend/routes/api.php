<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Include debug routes
require_once __DIR__ . '/debug.php';

// Include environment test routes
require_once __DIR__ . '/env-test.php';
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
use App\Models\User;
use App\Notifications\ChatMessageNotification;
use Illuminate\Support\Facades\DB;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/



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

// Debug endpoint for testing chat with migration trigger
Route::get('/debug/chat-test-migrate', function () {
    try {
        // Check if tables exist first
        $usersExists = \Illuminate\Support\Facades\Schema::hasTable('users');
        $appointmentsExists = \Illuminate\Support\Facades\Schema::hasTable('appointments');
        $subscriptionsExists = \Illuminate\Support\Facades\Schema::hasTable('subscriptions');
        
        if ($usersExists && $appointmentsExists && $subscriptionsExists) {
            return response()->json([
                'status' => 'ok',
                'message' => 'All tables already exist',
                'tables_exist' => true,
                'timestamp' => now()->toISOString()
            ]);
        }
        
        // Run migrations
        $exitCode = \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
        
        // Check tables after migration
        $usersExistsAfter = \Illuminate\Support\Facades\Schema::hasTable('users');
        $appointmentsExistsAfter = \Illuminate\Support\Facades\Schema::hasTable('appointments');
        $subscriptionsExistsAfter = \Illuminate\Support\Facades\Schema::hasTable('subscriptions');
        
        if ($exitCode === 0 && $usersExistsAfter && $appointmentsExistsAfter && $subscriptionsExistsAfter) {
            return response()->json([
                'status' => 'success',
                'message' => 'Migrations completed successfully',
                'exit_code' => $exitCode,
                'tables_created' => true,
                'timestamp' => now()->toISOString()
            ]);
        } else {
            return response()->json([
                'status' => 'error',
                'message' => 'Migrations failed or incomplete',
                'exit_code' => $exitCode,
                'tables_created' => false,
                'timestamp' => now()->toISOString()
            ]);
        }
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'error',
            'message' => 'Error running migrations: ' . $e->getMessage(),
            'timestamp' => now()->toISOString()
        ]);
    }
});

// Debug endpoint to trigger migrations
Route::get('/debug/trigger-migrations', function () {
    try {
        // Check current table status
        $usersExists = \Illuminate\Support\Facades\Schema::hasTable('users');
        $appointmentsExists = \Illuminate\Support\Facades\Schema::hasTable('appointments');
        $subscriptionsExists = \Illuminate\Support\Facades\Schema::hasTable('subscriptions');
        
        if ($usersExists && $appointmentsExists && $subscriptionsExists) {
            return response()->json([
                'status' => 'ok',
                'message' => 'All tables already exist',
                'tables_exist' => true,
                'timestamp' => now()->toISOString()
            ]);
        }
        
        // Run migrations
        $exitCode = \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
        
        // Check tables after migration
        $usersExistsAfter = \Illuminate\Support\Facades\Schema::hasTable('users');
        $appointmentsExistsAfter = \Illuminate\Support\Facades\Schema::hasTable('appointments');
        $subscriptionsExistsAfter = \Illuminate\Support\Facades\Schema::hasTable('subscriptions');
        
        if ($exitCode === 0 && $usersExistsAfter && $appointmentsExistsAfter && $subscriptionsExistsAfter) {
            return response()->json([
                'status' => 'success',
                'message' => 'Migrations completed successfully',
                'exit_code' => $exitCode,
                'tables_created' => true,
                'timestamp' => now()->toISOString()
            ]);
        } else {
            return response()->json([
                'status' => 'error',
                'message' => 'Migrations failed or incomplete',
                'exit_code' => $exitCode,
                'tables_created' => false,
                'timestamp' => now()->toISOString()
            ]);
        }
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'error',
            'message' => 'Error running migrations: ' . $e->getMessage(),
            'timestamp' => now()->toISOString()
        ]);
    }
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

// Debug endpoint for testing migrations
Route::get('/debug/migrations', function () {
    try {
        // Check if migrations table exists
        if (\Illuminate\Support\Facades\Schema::hasTable('migrations')) {
            $runMigrations = \Illuminate\Support\Facades\DB::table('migrations')->get();
            $migrationCount = $runMigrations->count();
            
            // Check if key tables exist
            $usersExists = \Illuminate\Support\Facades\Schema::hasTable('users');
            $appointmentsExists = \Illuminate\Support\Facades\Schema::hasTable('appointments');
            $subscriptionsExists = \Illuminate\Support\Facades\Schema::hasTable('subscriptions');
            
            return response()->json([
                'status' => 'ok',
                'migrations_table_exists' => true,
                'run_migrations_count' => $migrationCount,
                'tables_exist' => [
                    'users' => $usersExists,
                    'appointments' => $appointmentsExists,
                    'subscriptions' => $subscriptionsExists
                ],
                'last_migrations' => $runMigrations->take(5)->pluck('migration')->toArray(),
                'timestamp' => now()->toISOString()
            ]);
        } else {
            return response()->json([
                'status' => 'error',
                'message' => 'Migrations table does not exist',
                'timestamp' => now()->toISOString()
            ]);
        }
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'error',
            'message' => 'Error: ' . $e->getMessage(),
            'timestamp' => now()->toISOString()
        ]);
    }
});

// Debug endpoint to force run migrations
Route::post('/debug/run-migrations', function () {
    try {
        // Run migrations
        $exitCode = \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
        
        if ($exitCode === 0) {
            // Check tables after migration
            $usersExists = \Illuminate\Support\Facades\Schema::hasTable('users');
            $appointmentsExists = \Illuminate\Support\Facades\Schema::hasTable('appointments');
            $subscriptionsExists = \Illuminate\Support\Facades\Schema::hasTable('subscriptions');
            
            return response()->json([
                'status' => 'success',
                'message' => 'Migrations completed successfully',
                'exit_code' => $exitCode,
                'tables_created' => [
                    'users' => $usersExists,
                    'appointments' => $appointmentsExists,
                    'subscriptions' => $subscriptionsExists
                ],
                'timestamp' => now()->toISOString()
            ]);
        } else {
            return response()->json([
                'status' => 'error',
                'message' => 'Migrations failed',
                'exit_code' => $exitCode,
                'timestamp' => now()->toISOString()
            ]);
        }
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'error',
            'message' => 'Error running migrations: ' . $e->getMessage(),
            'timestamp' => now()->toISOString()
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
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthenticationController::class, 'register']);
    Route::post('/login', [AuthenticationController::class, 'login']);
    Route::post('/google-login', [AuthenticationController::class, 'googleLogin'])->withoutMiddleware(['auth:sanctum', 'auth:api']);
    Route::post('/send-verification-code', [AuthenticationController::class, 'sendVerificationCode']);
    Route::post('/verify-email', [AuthenticationController::class, 'verifyEmail']);
});

// Simple user check endpoint
Route::post('/check-user-exists', [AuthenticationController::class, 'checkUserExists']);

// Find user by email for Google authentication
Route::post('/find-user-by-email', [AuthenticationController::class, 'findUserByEmail']);

// Backward compatibility routes for mobile app
Route::post('/login', [AuthenticationController::class, 'login']);
Route::post('/register', [AuthenticationController::class, 'register']);

// Test endpoint for debugging
Route::get('/test-email-verification', function () {
    return response()->json([
        'status' => 'ok',
        'message' => 'Email verification test endpoint working',
        'timestamp' => now()->toISOString()
    ]);
});

// Test POST endpoint for debugging
Route::post('/test-post-endpoint', function () {
    return response()->json([
        'status' => 'ok',
        'message' => 'POST test endpoint working',
        'timestamp' => now()->toISOString(),
        'method' => 'POST'
    ]);
});

// Test email sending endpoint for debugging
Route::post('/test-email-sending', function (Request $request) {
    try {
        $email = $request->input('email', 'test@example.com');
        $code = '123456';
        
        // Test basic email sending
        \Illuminate\Support\Facades\Mail::raw("Test email with code: $code", function($message) use ($email) {
            $message->to($email)
                    ->subject('Test Email from DocAvailable')
                    ->from('Docavailable01@gmail.com', 'DocAvailable');
        });
        
        return response()->json([
            'success' => true,
            'message' => 'Test email sent successfully',
            'email' => $email,
            'code' => $code
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Test email failed',
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ], 500);
    }
});

// Test password reset email endpoint
Route::post('/test-password-reset-email', function (Request $request) {
    try {
        $email = $request->input('email', 'test@docavailable.com');
        
        // Find or create a test user
        $user = \App\Models\User::where('email', $email)->first();
        if (!$user) {
            $user = \App\Models\User::create([
                'first_name' => 'Test',
                'last_name' => 'User',
                'email' => $email,
                'password' => \Illuminate\Support\Facades\Hash::make('password123'),
                'user_type' => 'patient',
                'status' => 'active',
                'display_name' => 'Test User',
            ]);
        }
        
        // Generate a test reset URL
        $resetUrl = config('app.frontend_url') . '/password-reset/test-token-123?email=' . urlencode($email);
        
        // Send the password reset email
        \Illuminate\Support\Facades\Mail::to($user->email)->send(new \App\Mail\PasswordResetMail($user, $resetUrl));
        
        return response()->json([
            'success' => true,
            'message' => 'Password reset test email sent successfully',
            'email' => $email,
            'reset_url' => $resetUrl,
            'user_id' => $user->id
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Password reset test email failed',
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ], 500);
    }
});

// Test code-based password reset email endpoint
Route::post('/test-password-reset-code-email', function (Request $request) {
    try {
        $email = $request->input('email', 'test@docavailable.com');
        
        // Find or create a test user
        $user = \App\Models\User::where('email', $email)->first();
        if (!$user) {
            $user = \App\Models\User::create([
                'first_name' => 'Test',
                'last_name' => 'User',
                'email' => $email,
                'password' => \Illuminate\Support\Facades\Hash::make('password123'),
                'user_type' => 'patient',
                'status' => 'active',
                'display_name' => 'Test User',
            ]);
        }
        
        // Generate a test reset code
        $resetCode = \App\Models\PasswordResetCode::createForEmail($email);
        
        // Send the password reset code email
        \Illuminate\Support\Facades\Mail::to($user->email)->send(new \App\Mail\PasswordResetCodeMail($user, $resetCode->code));
        
        return response()->json([
            'success' => true,
            'message' => 'Password reset code test email sent successfully',
            'email' => $email,
            'code' => $resetCode->code,
            'expires_at' => $resetCode->expires_at->toISOString(),
            'user_id' => $user->id
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Password reset code test email failed',
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ], 500);
    }
});

// Test verification email endpoint
Route::post('/test-verification-email', function (Request $request) {
    try {
        $email = $request->input('email', 'test@example.com');
        $code = '123456';
        
        // Test verification email sending
        \Illuminate\Support\Facades\Mail::to($email)->send(new \App\Mail\VerificationCodeMail($code, $email));
        
        return response()->json([
            'success' => true,
            'message' => 'Verification email sent successfully',
            'email' => $email,
            'code' => $code
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Verification email failed',
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ], 500);
    }
});

// Email verification routes moved to auth prefix group above

// Chat routes (removed queue middleware)
Route::post('/chat/{appointmentId}/messages', [ChatController::class, 'sendMessage']);
Route::get('/chat/{appointmentId}/messages', [ChatController::class, 'getMessages']);
Route::post('/chat/{appointmentId}/typing/start', [ChatController::class, 'startTyping']);
Route::post('/chat/{appointmentId}/typing/stop', [ChatController::class, 'stopTyping']);
Route::get('/chat/{appointmentId}/typing', [ChatController::class, 'getTypingUsers']);

// Text session routes
Route::post('/text-sessions/end/{sessionId}', [TextSessionController::class, 'endSession']);
Route::get('/text-sessions/active', [TextSessionController::class, 'getAllActiveSessions']);
Route::get('/text-sessions/active-sessions', [TextSessionController::class, 'getActiveSessions']);
Route::get('/text-sessions/{sessionId}', [TextSessionController::class, 'getSession']);

// Simple test endpoint for frontend integration
Route::get('/test', function () {
    return response()->json([
        'status' => 'success',
        'message' => 'Backend is working correctly',
        'endpoints' => [
            'health' => '/api/health',
            'test' => '/api/test',
            'users' => '/api/users',
            'auth' => '/api/auth'
        ],
        'database' => 'connected',
        'migrations' => 'completed',
        'timestamp' => now()->toISOString()
    ]);
});

// Health check - Simplified version for better reliability
Route::get('/health', function () {
    $health = [
        'status' => 'ok',
        'timestamp' => now()->toISOString(),
        'message' => 'Backend is running',
        'services' => []
    ];

    // Test basic Laravel functionality
    try {
        $health['services']['laravel'] = [
            'status' => 'ok',
            'version' => app()->version(),
            'environment' => config('app.env'),
            'debug_mode' => config('app.debug')
        ];
    } catch (\Exception $e) {
        $health['services']['laravel'] = [
            'status' => 'error',
            'error' => $e->getMessage()
        ];
        $health['status'] = 'error';
    }

    // Test database connection (optional - don't fail if DB is down)
    try {
        $dbConnection = DB::connection()->getPdo();
        $health['services']['database'] = [
            'status' => 'ok',
            'driver' => config('database.default'),
            'connected' => true,
            'name' => DB::connection()->getDatabaseName(),
            'host' => config('database.connections.' . config('database.default') . '.host')
        ];
    } catch (\Exception $e) {
        $health['services']['database'] = [
            'status' => 'warning',
            'driver' => config('database.default'),
            'connected' => false,
            'error' => $e->getMessage(),
            'host' => config('database.connections.' . config('database.default') . '.host')
        ];
        // Don't set status to error for DB issues - just warn
    }

    // Test JWT configuration (optional)
    try {
        $health['services']['jwt'] = [
            'status' => 'ok',
            'secret_configured' => !empty(config('jwt.secret')),
            'jwt_secret_set' => !empty(env('JWT_SECRET'))
        ];
    } catch (\Exception $e) {
        $health['services']['jwt'] = [
            'status' => 'warning',
            'error' => $e->getMessage(),
            'secret_configured' => !empty(config('jwt.secret'))
        ];
    }

    // Test environment configuration
    $health['services']['environment'] = [
        'status' => 'ok',
        'app_env' => config('app.env'),
        'app_debug' => config('app.debug'),
        'db_connection' => config('database.default'),
        'db_host' => env('DB_HOST'),
        'jwt_secret_set' => !empty(env('JWT_SECRET'))
    ];

    return response()->json($health, 200);
});

// Webhook for auto-deductions (called by external services every 10 minutes)
Route::get('/webhook/auto-deductions', function() {
    try {
        // Process auto-deductions
        Artisan::call('sessions:process-auto-deductions');
        
        return response()->json([
            'status' => 'success',
            'message' => 'Auto-deductions processed',
            'timestamp' => now()->toISOString(),
            'processed_at' => now()->format('Y-m-d H:i:s')
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'error',
            'message' => 'Failed to process auto-deductions: ' . $e->getMessage(),
            'timestamp' => now()->toISOString()
        ], 500);
    }
});

// Password reset routes (no auth required) - temporarily without rate limiting for testing
Route::post('/forgot-password', [\App\Http\Controllers\Auth\PasswordResetLinkController::class, 'store'])->withoutMiddleware(['throttle']);
Route::post('/reset-password', [\App\Http\Controllers\Auth\NewPasswordController::class, 'store'])->withoutMiddleware(['throttle']);

// Code-based password reset routes
Route::post('/verify-reset-code', [\App\Http\Controllers\Auth\PasswordResetCodeController::class, 'verifyCode'])->withoutMiddleware(['throttle']);
Route::post('/reset-password-with-code', [\App\Http\Controllers\Auth\PasswordResetCodeController::class, 'resetPassword'])->withoutMiddleware(['throttle']);

// Public plans routes (no auth required for viewing plans)
Route::get('/plans/public', [\App\Http\Controllers\PlanController::class, 'getAllPlans']);
Route::get('/plans/pricing', [\App\Http\Controllers\PlanController::class, 'getPricingForCountry']);

// Seed plans endpoint (for production setup)
Route::post('/seed-plans', function () {
    try {
        // Check if plans already exist
        $existingPlans = \App\Models\Plan::count();
        
        if ($existingPlans > 0) {
            return response()->json([
                'success' => true,
                'message' => "Plans already exist ($existingPlans plans found). No action needed.",
                'plans_count' => $existingPlans
            ]);
        }

        $plans = [
            [
                'name' => 'Basic Life',
                'features' => json_encode([
                    'video_calls' => 1,
                    'voice_calls' => 2,
                    'consultations' => 5,
                    'text_sessions' => 10,
                    'health_records' => false,
                    'priority_support' => false
                ]),
                'currency' => 'USD',
                'price' => 999,
                'duration' => 30,
                'status' => 1,
                'text_sessions' => 10,
                'voice_calls' => 2,
                'video_calls' => 1,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'name' => 'Executive Life',
                'features' => json_encode([
                    'video_calls' => 3,
                    'voice_calls' => 5,
                    'consultations' => 15,
                    'text_sessions' => 30,
                    'health_records' => true,
                    'priority_support' => false
                ]),
                'currency' => 'USD',
                'price' => 1999,
                'duration' => 30,
                'status' => 1,
                'text_sessions' => 30,
                'voice_calls' => 5,
                'video_calls' => 3,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'name' => 'Premium Life',
                'features' => json_encode([
                    'video_calls' => 5,
                    'voice_calls' => 10,
                    'consultations' => 30,
                    'text_sessions' => 60,
                    'health_records' => true,
                    'priority_support' => true
                ]),
                'currency' => 'USD',
                'price' => 3999,
                'duration' => 30,
                'status' => 1,
                'text_sessions' => 60,
                'voice_calls' => 10,
                'video_calls' => 5,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'name' => 'Basic Life',
                'features' => json_encode([
                    'video_calls' => 1,
                    'voice_calls' => 2,
                    'consultations' => 5,
                    'text_sessions' => 10,
                    'health_records' => false,
                    'priority_support' => false
                ]),
                'currency' => 'MWK',
                'price' => 100,
                'duration' => 30,
                'status' => 1,
                'text_sessions' => 10,
                'voice_calls' => 2,
                'video_calls' => 1,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'name' => 'Executive Life',
                'features' => json_encode([
                    'video_calls' => 3,
                    'voice_calls' => 5,
                    'consultations' => 15,
                    'text_sessions' => 30,
                    'health_records' => true,
                    'priority_support' => false
                ]),
                'currency' => 'MWK',
                'price' => 150,
                'duration' => 30,
                'status' => 1,
                'text_sessions' => 30,
                'voice_calls' => 5,
                'video_calls' => 3,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'name' => 'Premium Life',
                'features' => json_encode([
                    'video_calls' => 5,
                    'voice_calls' => 10,
                    'consultations' => 30,
                    'text_sessions' => 60,
                    'health_records' => true,
                    'priority_support' => true
                ]),
                'currency' => 'MWK',
                'price' => 200,
                'duration' => 30,
                'status' => 1,
                'text_sessions' => 60,
                'voice_calls' => 10,
                'video_calls' => 5,
                'created_at' => now(),
                'updated_at' => now()
            ]
        ];

        $createdPlans = [];
        foreach ($plans as $plan) {
            $createdPlan = \App\Models\Plan::create($plan);
            $createdPlans[] = $createdPlan;
        }

        return response()->json([
            'success' => true,
            'message' => 'Plans seeded successfully!',
            'plans_count' => count($createdPlans),
            'plans' => $createdPlans
        ]);

    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Failed to seed plans: ' . $e->getMessage(),
            'error' => $e->getMessage()
        ], 500);
    }
});

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
    Route::post('/text-sessions/start', [TextSessionController::class, 'start']);
    Route::post('/text-sessions/create-from-appointment', [TextSessionController::class, 'createFromAppointment']);
    Route::get('/text-sessions/active-sessions', [TextSessionController::class, 'activeSessions']);
    Route::get('/text-sessions/{sessionId}', [TextSessionController::class, 'getSession']);
    Route::get('/text-sessions/{sessionId}/check-response', [TextSessionController::class, 'checkResponse']);
    Route::put('/text-sessions/{sessionId}/status', [TextSessionController::class, 'updateStatus']);
    Route::post('/text-sessions/{sessionId}/auto-deduction', [TextSessionController::class, 'processAutoDeduction']);
    Route::post('/text-sessions/{sessionId}/end', [TextSessionController::class, 'endSession']);
    Route::get('/text-sessions/available-doctors', [TextSessionController::class, 'availableDoctors']);
    
    // Text appointment session routes
    Route::post('/text-appointments/start-session', [TextAppointmentController::class, 'startSession']);
    Route::post('/text-appointments/update-activity', [TextAppointmentController::class, 'updateActivity']);
    Route::post('/text-appointments/process-deduction', [TextAppointmentController::class, 'processDeduction']);
    Route::post('/text-appointments/end-session', [TextAppointmentController::class, 'endSession']);
    Route::get('/text-appointments/{appointmentId}/session-status', [TextAppointmentController::class, 'getSessionStatus']);
    
    // Call session routes
    Route::post('/call-sessions/check-availability', [App\Http\Controllers\CallSessionController::class, 'checkAvailability']);
    Route::post('/call-sessions/start', [App\Http\Controllers\CallSessionController::class, 'start']);
    Route::post('/call-sessions/end', [App\Http\Controllers\CallSessionController::class, 'end']);
    Route::post('/call-sessions/deduction', [App\Http\Controllers\CallSessionController::class, 'deduction']);
    Route::post('/call-sessions/re-notify', [App\Http\Controllers\CallSessionController::class, 'reNotify']);
    Route::post('/call-sessions/answer', [App\Http\Controllers\CallSessionController::class, 'answer']);
    Route::post('/call-sessions/decline', [App\Http\Controllers\CallSessionController::class, 'decline']);

    // Debug: Tail laravel.log (last 200 lines)
    Route::get('/debug/log-tail', function () {
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

    // Debug: Show masked doctor push token and flags
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
    
});

// Public debug endpoints (guarded by shared secret)
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

// Public chatbot routes (no authentication required)
Route::post('/chatbot/response', [App\Http\Controllers\ChatbotController::class, 'getResponse']);
Route::post('/chatbot/streaming', [App\Http\Controllers\ChatbotController::class, 'getStreamingResponse']);
Route::get('/chatbot/test-config', [App\Http\Controllers\ChatbotController::class, 'testConfig']);
Route::get('/chatbot/test-openai', function () {
    $apiKey = env('OPENAI_API_KEY');
    
    if (empty($apiKey)) {
        return response()->json(['error' => 'No API key found']);
    }
    
    // Clean the API key - remove any whitespace or hidden characters
    $apiKey = trim($apiKey);
    
    return response()->json([
        'api_key_length' => strlen($apiKey),
        'api_key_starts_with_sk' => str_starts_with($apiKey, 'sk-'),
        'api_key_ends_with' => substr($apiKey, -10),
        'api_key_has_spaces' => str_contains($apiKey, ' '),
        'api_key_has_newlines' => str_contains($apiKey, "\n"),
        'api_key_has_tabs' => str_contains($apiKey, "\t"),
        'raw_length' => strlen(env('OPENAI_API_KEY')),
    ]);
});

Route::get('/chatbot/test-simple-openai', function () {
    $apiKey = trim(env('OPENAI_API_KEY'));
    
    try {
        // Try with a simpler model first
        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $apiKey,
            'Content-Type' => 'application/json',
        ])->timeout(30)->post('https://api.openai.com/v1/models');
        
        return response()->json([
            'status' => $response->status(),
            'success' => $response->successful(),
            'body' => $response->body(),
            'api_key_preview' => substr($apiKey, 0, 20) . '...' . substr($apiKey, -10),
        ]);
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()]);
    }
});

// Debug endpoint to check environment variables
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

// Debug endpoint to check user country information
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

// Doctor routes
Route::prefix('doctors')->group(function () {
    Route::get('/', [UserController::class, 'getActiveDoctors']); // List all doctors
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
        'fcm_project_id' => config('services.fcm.project_id'),
        'service_account_exists' => file_exists(storage_path('app/firebase-service-account.json')),
        'notification_channel' => 'fcm'
    ]);
});

Route::post('/test-notification', function(Request $request) {
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
Route::post('/test-notification-by-email', function(Illuminate\Http\Request $request) {
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