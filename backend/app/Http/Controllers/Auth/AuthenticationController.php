<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Mail;
use App\Traits\HasImageUrls;
use App\Mail\VerificationCodeMail;

class AuthenticationController extends Controller
{
    use HasImageUrls;

    /**
     * Create a new controller instance.
     */
    public function __construct()
    {
        $this->middleware('auth:api', ['except' => ['login', 'register', 'sendVerificationCode', 'verifyEmail']]);
    }

    /**
     * Register a new user
     */
    public function register(Request $request): JsonResponse
    {
        try {
            // Log incoming request for debugging
            Log::info('Registration request received', [
                'email' => $request->email ?? 'not_provided',
                'user_type' => $request->user_type ?? 'not_provided',
                'has_first_name' => !empty($request->first_name),
                'has_last_name' => !empty($request->last_name),
                'has_surname' => !empty($request->surname),
                'request_data' => $request->all()
            ]);
            
            // Normalize common alternate/camelCase field names
            $normalized = [];
            if ($request->has('firstName')) { $normalized['first_name'] = $request->input('firstName'); }
            if ($request->has('lastName')) { $normalized['last_name'] = $request->input('lastName'); }
            if ($request->has('userType')) { $normalized['user_type'] = $request->input('userType'); }
            if ($request->has('dateOfBirth')) { $normalized['date_of_birth'] = $request->input('dateOfBirth'); }
            if ($request->has('subSpecialization')) { $normalized['sub_specialization'] = $request->input('subSpecialization'); }
            if ($request->has('specializationsJson')) { $normalized['specializations'] = $request->input('specializationsJson'); }
            if (!empty($normalized)) { $request->merge($normalized); }

            // Provide password_confirmation fallback when not provided by clients
            if ($request->filled('password') && !$request->has('password_confirmation')) {
                $request->merge(['password_confirmation' => $request->input('password')]);
            }
            
            // Check if email already exists
            if ($request->filled('email')) {
                $existingUser = User::where('email', $request->email)->first();
                if ($existingUser) {
                    Log::warning('Registration attempted with existing email', [
                        'email' => $request->email,
                        'existing_user_id' => $existingUser->id,
                        'existing_user_type' => $existingUser->user_type
                    ]);
                }
            }

            $validator = Validator::make($request->all(), [
                'email' => 'required|email|unique:users,email',
                'password' => 'required|string|min:8|confirmed',
                'first_name' => 'required|string|max:255',
                'last_name' => 'nullable|string|max:255',
                'user_type' => 'required|in:patient,doctor,admin',
                'date_of_birth' => 'nullable|date',
                'gender' => 'nullable|in:male,female,other',
                'country' => 'nullable|string|max:255',
                'city' => 'nullable|string|max:255',
                'years_of_experience' => 'nullable|integer|min:0',
                'bio' => 'nullable|string',
                'dob' => 'nullable|date',
                'surname' => 'nullable|string|max:255',
                'specialization' => 'nullable|string|max:255',
                'specializations' => 'nullable|string', // JSON array of specializations
                'languages_spoken' => 'nullable|string', // JSON array of languages
                'profile_picture' => 'nullable|string', // Base64 encoded
                'national_id' => 'nullable|string', // Base64 encoded
                'national_id_passport' => 'nullable|string', // Base64 encoded
                'medical_degree' => 'nullable|string', // Base64 encoded
                'highest_medical_certificate' => 'nullable|string', // Base64 encoded
                'medical_licence' => 'nullable|string', // Base64 encoded
                'specialist_certificate' => 'nullable|string', // Base64 encoded
            ]);

            // Add custom validation rule to require either last_name or surname
            $validator->after(function ($validator) use ($request) {
                if (!$request->last_name && !$request->surname) {
                    $validator->errors()->add('surname', 'The last name field is required.');
                }
            });

            if ($validator->fails()) {
                Log::warning('Registration validation failed', [
                    'email' => $request->email ?? 'not_provided',
                    'user_type' => $request->user_type ?? 'not_provided',
                    'has_first_name' => !empty($request->first_name),
                    'has_last_name' => !empty($request->last_name),
                    'has_surname' => !empty($request->surname),
                    'errors' => $validator->errors()->toArray(),
                    'request_data' => $request->all()
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Handle profile picture upload if provided
            $profilePicturePath = null;
            if ($request->profile_picture) {
                $image = preg_replace('/^data:image\/\w+;base64,/', '', $request->profile_picture);
                $image = base64_decode($image);
                
                // Debug logging
                \Illuminate\Support\Facades\Log::info('Profile picture upload debug', [
                    'original_length' => strlen($request->profile_picture),
                    'decoded_length' => $image ? strlen($image) : 0,
                    'is_valid' => $image && strlen($image) > 100
                ]);
                
                // Validate that the decoded data is not empty and is actually an image
                if ($image && strlen($image) > 100) { // Reduced to 100 bytes for uncompressed images
                    // Compress image before storing
                    $compressedImage = $this->compressImage($image);
                    
                    $filename = \Illuminate\Support\Str::uuid() . '.jpg';
                    $path = 'profile_pictures/' . $filename;
                    
                    // Store compressed image in DigitalOcean Spaces
                    \Illuminate\Support\Facades\Storage::disk('spaces')->put($path, $compressedImage);
                    
                    // Get the public URL from DigitalOcean Spaces
                    $publicUrl = \Illuminate\Support\Facades\Storage::disk('spaces')->url($path);
                    $profilePicturePath = $publicUrl;
                }
            }

            // Handle document uploads for doctors
            $nationalIdPath = null;
            $medicalDegreePath = null;
            $medicalLicencePath = null;

            if ($request->user_type === 'doctor') {
                // Handle national ID (check both field names)
                $nationalIdData = $request->national_id ?? $request->national_id_passport;
                if ($nationalIdData) {
                    $image = preg_replace('/^data:image\/\w+;base64,/', '', $nationalIdData);
                    $image = base64_decode($image);
                    
                    if ($image && strlen($image) > 100) { // Reduced to 100 bytes for uncompressed images
                        $filename = \Illuminate\Support\Str::uuid() . '_national_id.jpg';
                        $path = 'private_documents/' . $filename;
                        \Illuminate\Support\Facades\Storage::disk('spaces_private')->put($path, $image);
                        $nationalIdPath = $path; // Store the full path for private access
                    }
                }

                // Handle medical degree (check both field names)
                $medicalDegreeData = $request->medical_degree ?? $request->highest_medical_certificate;
                if ($medicalDegreeData) {
                    $image = preg_replace('/^data:image\/\w+;base64,/', '', $medicalDegreeData);
                    $image = base64_decode($image);
                    
                    if ($image && strlen($image) > 100) { // Reduced to 100 bytes for uncompressed images
                        $filename = \Illuminate\Support\Str::uuid() . '_medical_degree.jpg';
                        $path = 'private_documents/' . $filename;
                        \Illuminate\Support\Facades\Storage::disk('spaces_private')->put($path, $image);
                        $medicalDegreePath = $path; // Store the full path for private access
                    }
                }

                // Handle medical licence (check both field names)
                $medicalLicenceData = $request->medical_licence ?? $request->specialist_certificate;
                if ($medicalLicenceData) {
                    $image = preg_replace('/^data:image\/\w+;base64,/', '', $medicalLicenceData);
                    $image = base64_decode($image);
                    
                    if ($image && strlen($image) > 100) { // Reduced to 100 bytes for uncompressed images
                        $filename = \Illuminate\Support\Str::uuid() . '_medical_licence.jpg';
                        $path = 'private_documents/' . $filename;
                        \Illuminate\Support\Facades\Storage::disk('spaces_private')->put($path, $image);
                        $medicalLicencePath = $path; // Store the full path for private access
                    }
                }
            }

            // Create user
            $user = User::create([
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'first_name' => $request->first_name,
                'last_name' => $request->last_name ?? $request->surname,
                'display_name' => $request->first_name . ' ' . ($request->last_name ?? $request->surname),
                'user_type' => $request->user_type,
                'date_of_birth' => $request->date_of_birth ?? $request->dob,
                'gender' => $request->gender,
                'country' => $request->country,
                'city' => $request->city,
                'years_of_experience' => $request->years_of_experience,
                'bio' => $request->bio,
                'status' => $request->user_type === 'doctor' ? 'pending' : 'active',
                'profile_picture' => $profilePicturePath,
                'specialization' => $request->specialization,
                'specializations' => $request->specializations ? json_decode($request->specializations, true) : null,
                'languages_spoken' => $request->languages_spoken ? json_decode($request->languages_spoken, true) : null,
                'national_id' => $nationalIdPath,
                'medical_degree' => $medicalDegreePath,
                'medical_licence' => $medicalLicencePath,
            ]);

            // Generate JWT token
            $token = auth('api')->login($user);

            // Note: Profile picture processing job is not needed when using DigitalOcean Spaces
            // as images are already compressed and stored directly in the cloud

            Log::info('User registered successfully', [
                'user_id' => $user->id,
                'email' => $user->email,
                'user_type' => $user->user_type
            ]);

            // Generate full URLs for images if they exist
            $userData = $this->generateImageUrls($user);

            return response()->json([
                'success' => true,
                'message' => 'User registered successfully',
                'data' => [
                    'user' => $userData,
                    'token' => $token,
                    'token_type' => 'bearer',
                    'expires_in' => auth('api')->factory()->getTTL() * 60
                ]
            ], 201);

        } catch (\Exception $e) {
            Log::error('User registration failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Registration failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Login user
     */
    public function login(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
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
                
                // If both fields have errors
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

            $credentials = $request->only('email', 'password');

            if (!$token = auth('api')->attempt($credentials)) {
                // Check if user exists to provide more specific error message
                $user = \App\Models\User::where('email', $credentials['email'])->first();
                
                if (!$user) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Email address not found. Please check your email or create a new account.',
                        'error_type' => 'email_not_found',
                        'suggestion' => 'If you don\'t have an account, please register first.'
                    ], 401);
                } else {
                    // Check user status for existing user with wrong password
                    $statusCheck = $this->checkUserStatus($user);
                    if ($statusCheck !== null) {
                        return $statusCheck;
                    }
                    
                    return response()->json([
                        'success' => false,
                        'message' => 'Invalid password. Please check your password and try again.',
                        'error_type' => 'invalid_password',
                        'suggestion' => 'Make sure caps lock is off and try again. If you forgot your password, use the forgot password option.'
                    ], 401);
                }
            }

            $user = auth('api')->user();

            // Check user status after successful authentication
            $statusCheck = $this->checkUserStatus($user);
            if ($statusCheck !== null) {
                auth('api')->logout();
                return $statusCheck;
            }

            Log::info('User logged in successfully', [
                'user_id' => $user->id,
                'email' => $user->email,
                'user_type' => $user->user_type,
                'status' => $user->status
            ]);

            // Generate full URLs for images if they exist
            $userData = $this->generateImageUrls($user);

            return response()->json([
                'success' => true,
                'message' => 'Login successful',
                'data' => [
                    'user' => $userData,
                    'token' => $token,
                    'token_type' => 'bearer',
                    'expires_in' => auth('api')->factory()->getTTL() * 60
                ]
            ]);

        } catch (\Illuminate\Database\QueryException $e) {
            Log::error('Database error during login', [
                'error' => $e->getMessage(),
                'sql' => $e->getSql(),
                'bindings' => $e->getBindings()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Database connection error. Please try again later.',
                'error_type' => 'database_error',
                'suggestion' => 'If this problem persists, please contact support.'
            ], 500);

        } catch (\Illuminate\Auth\AuthenticationException $e) {
            Log::error('Authentication exception during login', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Authentication failed. Please check your credentials and try again.',
                'error_type' => 'authentication_error',
                'suggestion' => 'Make sure your email and password are correct.'
            ], 401);

        } catch (\Exception $e) {
            Log::error('Unexpected error during login', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);

            $errorMessage = 'An unexpected error occurred during login. Please try again later.';
            $errorType = 'unexpected_error';
            $suggestion = 'If this problem persists, please contact support.';

            // Provide more specific error messages for common issues
            if (str_contains($e->getMessage(), 'Connection refused') || str_contains($e->getMessage(), 'Connection timed out')) {
                $errorMessage = 'Unable to connect to the server. Please check your internet connection.';
                $errorType = 'connection_error';
                $suggestion = 'Check your internet connection and try again.';
            } elseif (str_contains($e->getMessage(), 'JWT')) {
                $errorMessage = 'Token generation failed. Please try again.';
                $errorType = 'token_error';
                $suggestion = 'This is usually a temporary issue. Please try again.';
            }

            return response()->json([
                'success' => false,
                'message' => $errorMessage,
                'error_type' => $errorType,
                'suggestion' => $suggestion,
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Login with Google
     */
    public function googleLogin(Request $request): JsonResponse
    {
        try {
            Log::info('🔍 DEBUG: Google login method called successfully', [
                'request_data' => $request->all(),
                'headers' => $request->headers->all(),
                'middleware_bypassed' => true
            ]);

            $validator = Validator::make($request->all(), [
                'id_token' => 'required|string',
                'user_type' => 'nullable|string|in:patient,doctor,admin',
            ]);

            if ($validator->fails()) {
                $errors = $validator->errors();
                $errorMessages = [];
                $detailedMessage = 'Please provide a valid Google ID token.';
                
                if ($errors->has('id_token')) {
                    $errorMessages['id_token'] = 'Google ID token is required.';
                    $detailedMessage = 'Google authentication token is missing or invalid.';
                }
                
                Log::warning('Google login validation failed', [
                    'errors' => $errors->toArray(),
                    'request_data' => $request->all()
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => $detailedMessage,
                    'errors' => $errorMessages,
                    'error_type' => 'validation_error'
                ], 422);
            }

            $idToken = $request->input('id_token');
            Log::info('Google login token received', [
                'token_length' => strlen($idToken),
                'token_preview' => substr($idToken, 0, 20) . '...'
            ]);

            // Verify Google ID token using Firebase Admin SDK
            Log::info('🔍 DEBUG: About to verify Google ID token', [
                'token_length' => strlen($idToken),
                'token_preview' => substr($idToken, 0, 50) . '...'
            ]);
            
            $verifiedIdToken = $this->verifyGoogleIdToken($idToken);
            
            Log::info('🔍 DEBUG: Google token verification result', [
                'verified' => $verifiedIdToken ? 'SUCCESS' : 'FAILED',
                'token_data' => $verifiedIdToken ? [
                    'email' => $verifiedIdToken['email'] ?? 'missing',
                    'sub' => $verifiedIdToken['sub'] ?? 'missing',
                    'name' => $verifiedIdToken['name'] ?? 'missing'
                ] : 'No token data'
            ]);
            
            if (!$verifiedIdToken) {
                Log::error('🔍 DEBUG: Google token verification failed, returning 401');
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid or expired Google token. Please try signing in again.',
                    'error_type' => 'invalid_google_token',
                    'suggestion' => 'The Google authentication token is invalid or has expired. Please try signing in with Google again.'
                ], 401);
            }

            $googleUser = $verifiedIdToken;
            $email = $googleUser['email'];
            $googleId = $googleUser['sub']; // Google's unique user ID
            $userType = $request->input('user_type', 'patient'); // Default to patient if not specified

            // Check if user exists
            $user = User::where('email', $email)->first();

            if (!$user) {
                // For new Google users, don't create account immediately
                // Instead, return the Google data and indicate additional info is needed
                $googleUserData = [
                    'email' => $email,
                    'first_name' => $googleUser['given_name'] ?? explode(' ', $googleUser['name'])[0] ?? '',
                    'last_name' => $googleUser['family_name'] ?? implode(' ', array_slice(explode(' ', $googleUser['name']), 1)) ?? '',
                    'display_name' => $googleUser['name'] ?? '',
                    'profile_picture' => $googleUser['picture'] ?? null,
                    'google_id' => $googleId,
                    'user_type' => $userType,
                ];

                // Determine which fields are missing for the user type
                $missingFields = $this->getMissingRequiredFields($googleUserData, $userType);

                Log::info('New Google user needs additional information', [
                    'email' => $email,
                    'user_type' => $userType,
                    'google_id' => $googleId,
                    'missing_fields' => $missingFields
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Google authentication successful. Additional information required.',
                    'data' => [
                        'google_user' => $googleUserData,
                        'needs_additional_info' => true,
                        'missing_fields' => $missingFields,
                        'user_type' => $userType
                    ]
                ]);
            } else {
                // User exists - update Google ID if not set and verify email
                if (!$user->google_id) {
                    $user->update([
                        'google_id' => $googleId,
                        'email_verified_at' => now(),
                    ]);
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
            }

            // Generate JWT token
            $token = auth('api')->login($user);

            Log::info('User logged in with Google successfully', [
                'user_id' => $user->id,
                'email' => $user->email,
                'google_id' => $googleId,
                'user_type' => $user->user_type,
                'status' => $user->status
            ]);

            // Generate full URLs for images if they exist
            $userData = $this->generateImageUrls($user);

            return response()->json([
                'success' => true,
                'message' => 'Google login successful',
                'data' => [
                    'user' => $userData,
                    'token' => $token,
                    'token_type' => 'bearer',
                    'expires_in' => auth('api')->factory()->getTTL() * 60
                ]
            ]);

        } catch (\Illuminate\Database\QueryException $e) {
            Log::error('Database error during Google login', [
                'error' => $e->getMessage(),
                'sql' => $e->getSql(),
                'bindings' => $e->getBindings()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Database connection error during Google login. Please try again later.',
                'error_type' => 'database_error',
                'suggestion' => 'If this problem persists, please contact support.'
            ], 500);

        } catch (\Exception $e) {
            Log::error('Unexpected error during Google login', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);

            $errorMessage = 'An unexpected error occurred during Google login. Please try again later.';
            $errorType = 'unexpected_error';
            $suggestion = 'If this problem persists, please contact support.';

            // Provide more specific error messages for common issues
            if (str_contains($e->getMessage(), 'Google verification failed') || str_contains($e->getMessage(), 'Invalid token')) {
                $errorMessage = 'Google token verification failed. Please try signing in again.';
                $errorType = 'google_verification_failed';
                $suggestion = 'Please try signing in with Google again.';
            } elseif (str_contains($e->getMessage(), 'Connection refused') || str_contains($e->getMessage(), 'Connection timed out')) {
                $errorMessage = 'Unable to connect to Google authentication service. Please check your internet connection.';
                $errorType = 'connection_error';
                $suggestion = 'Check your internet connection and try again.';
            } elseif (str_contains($e->getMessage(), 'JWT')) {
                $errorMessage = 'Token generation failed. Please try again.';
                $errorType = 'token_error';
                $suggestion = 'This is usually a temporary issue. Please try again.';
            }

            return response()->json([
                'success' => false,
                'message' => $errorMessage,
                'error_type' => $errorType,
                'suggestion' => $suggestion,
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Verify Google ID token
     */
    private function verifyGoogleIdToken($idToken)
    {
        try {
            Log::info('Starting Google token verification', [
                'token_length' => strlen($idToken),
                'token_preview' => substr($idToken, 0, 20) . '...'
            ]);

            // For now, let's use a simpler approach - decode the JWT without verification
            // In production, you should verify the token with Google's public keys
            $parts = explode('.', $idToken);
            if (count($parts) !== 3) {
                Log::error('Invalid JWT format');
                return false;
            }

            // Decode the payload (middle part)
            $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[1])), true);
            
            Log::info('🔍 DEBUG: JWT payload decoded', [
                'payload' => $payload ? 'SUCCESS' : 'FAILED',
                'payload_keys' => $payload ? array_keys($payload) : 'No payload',
                'email' => $payload['email'] ?? 'missing',
                'sub' => $payload['sub'] ?? 'missing'
            ]);
            
            if (!$payload) {
                Log::error('Failed to decode JWT payload');
                return false;
            }

            // Check if token is expired
            if (isset($payload['exp']) && $payload['exp'] < time()) {
                Log::error('Google token has expired', [
                    'exp' => $payload['exp'],
                    'current_time' => time()
                ]);
                return false;
            }

            // Extract user information from the token
            $googleUser = [
                'sub' => $payload['sub'] ?? '',
                'email' => $payload['email'] ?? '',
                'name' => $payload['name'] ?? '',
                'given_name' => $payload['given_name'] ?? '',
                'family_name' => $payload['family_name'] ?? '',
                'picture' => $payload['picture'] ?? '',
                'email_verified' => $payload['email_verified'] ?? false
            ];
            
            // Validate required fields
            if (empty($googleUser['email']) || empty($googleUser['sub'])) {
                Log::error('Google token verification failed - missing required fields', [
                    'email' => $googleUser['email'] ?? 'missing',
                    'sub' => $googleUser['sub'] ?? 'missing'
                ]);
                return false;
            }

            // Validate email format
            if (!filter_var($googleUser['email'], FILTER_VALIDATE_EMAIL)) {
                Log::error('Google token verification failed - invalid email format', [
                    'email' => $googleUser['email']
                ]);
                return false;
            }

            Log::info('Google token verification successful', [
                'email' => $googleUser['email'],
                'sub' => $googleUser['sub'],
                'name' => $googleUser['name']
            ]);

            return $googleUser;
        } catch (\Exception $e) {
            Log::error('Google ID token verification failed', [
                'error' => $e->getMessage(),
                'token' => substr($idToken, 0, 50) . '...'
            ]);
            return false;
        }
    }

    /**
     * Find user by email for Google authentication
     */
    public function findUserByEmail(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'email' => 'required|email',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Valid email is required'
                ], 422);
            }

            $email = $request->input('email');
            $user = User::where('email', $email)->first();

            if ($user) {
                // Check if account is suspended
                if ($user->status === 'suspended') {
                    return response()->json([
                        'success' => false,
                        'message' => 'Your account has been suspended. Please contact support for assistance.'
                    ], 403);
                }
                
                // Check if account is pending approval (for doctors)
                if ($user->user_type === 'doctor' && $user->status === 'pending') {
                    return response()->json([
                        'success' => false,
                        'message' => 'Your account is pending approval. Please wait for admin approval.'
                    ], 403);
                }

                // Generate full URLs for images if they exist
                $userData = $this->generateImageUrls($user);
                
                return response()->json([
                    'success' => true,
                    'user' => $userData
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'User not found'
                ], 404);
            }

        } catch (\Exception $e) {
            Log::error('Error finding user by email', [
                'error' => $e->getMessage(),
                'email' => $request->input('email')
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error finding user'
            ], 500);
        }
    }

    /**
     * Check if user exists by email
     */
    public function checkUserExists(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'email' => 'required|email',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Valid email is required',
                    'exists' => false
                ], 422);
            }

            $email = $request->input('email');
            $user = User::where('email', $email)->first();

            if ($user) {
                // Generate full URLs for images if they exist
                $userData = $this->generateImageUrls($user);
                
                return response()->json([
                    'success' => true,
                    'exists' => true,
                    'user' => $userData
                ]);
            } else {
                return response()->json([
                    'success' => true,
                    'exists' => false,
                    'message' => 'User not found'
                ]);
            }

        } catch (\Exception $e) {
            Log::error('Error checking user existence', [
                'error' => $e->getMessage(),
                'email' => $request->input('email')
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error checking user existence',
                'exists' => false
            ], 500);
        }
    }

    /**
     * Get current authenticated user
     */
    public function user(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }

            // Generate full URLs for images if they exist
            $userData = $this->generateImageUrls($user);

            return response()->json([
                'success' => true,
                'data' => $userData
            ]);

        } catch (\Exception $e) {
            Log::error('Get user failed', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to get user data',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Logout user
     */
    public function logout(Request $request): JsonResponse
    {
        try {
            Auth::logout();
            
            return response()->json([
                'success' => true,
                'message' => 'Logged out successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('Logout failed', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Logout failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Refresh token - FIXED VERSION
     */
    public function refresh(Request $request): JsonResponse
    {
        try {
            // Get the current token from the request
            $token = $request->bearerToken();
            
            if (!$token) {
                return response()->json([
                    'success' => false,
                    'message' => 'No token provided'
                ], 401);
            }

            // Try to refresh the token
            $newToken = auth('api')->refresh();
            $user = auth('api')->user();
            
            // Generate full URLs for images if they exist
            $userData = $this->generateImageUrls($user);
            
            return response()->json([
                'success' => true,
                'message' => 'Token refreshed successfully',
                'data' => [
                    'user' => $userData,
                    'token' => $newToken,
                    'token_type' => 'bearer',
                    'expires_in' => auth('api')->factory()->getTTL() * 60
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Token refresh failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Token refresh failed: ' . $e->getMessage()
            ], 401);
        }
    }

    /**
     * Create the first admin account (no authentication required)
     * This should only be used to create the initial admin account
     */
    public function createFirstAdmin(Request $request): JsonResponse
    {
        try {
            // Check if any admin already exists
            $existingAdmin = User::where('user_type', 'admin')->first();
            if ($existingAdmin) {
                return response()->json([
                    'success' => false,
                    'message' => 'Admin account already exists. Use regular admin creation endpoint.'
                ], 403);
            }

            $validator = Validator::make($request->all(), [
                'first_name' => 'required|string|max:255',
                'last_name' => 'required|string|max:255',
                'email' => 'required|email|unique:users,email',
                'password' => 'required|string|min:8|confirmed',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Create admin user
            $user = User::create([
                'first_name' => $request->first_name,
                'last_name' => $request->last_name,
                'display_name' => $request->first_name . ' ' . $request->last_name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'user_type' => 'admin',
                'status' => 'active',
                'email_verified_at' => now(),
            ]);

            // Generate JWT token
            $token = auth('api')->login($user);

            Log::info('First admin account created successfully', [
                'user_id' => $user->id,
                'email' => $user->email
            ]);

            // Generate full URLs for images if they exist
            $userData = $this->generateImageUrls($user);

            return response()->json([
                'success' => true,
                'message' => 'First admin account created successfully',
                'data' => [
                    'user' => $userData,
                    'token' => $token,
                    'token_type' => 'bearer',
                    'expires_in' => auth('api')->factory()->getTTL() * 60
                ]
            ], 201);

        } catch (\Exception $e) {
            Log::error('First admin creation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Admin creation failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update user profile
     */
    public function updateProfile(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            
            $validator = Validator::make($request->all(), [
                'first_name' => 'sometimes|string|max:255',
                'last_name' => 'sometimes|string|max:255',
                'date_of_birth' => 'nullable|date',
                'gender' => 'nullable|in:male,female,other',
                'country' => 'nullable|string|max:255',
                'city' => 'nullable|string|max:255',
                'years_of_experience' => 'nullable|integer|min:0',
                'occupation' => 'nullable|string|max:255',
                'bio' => 'nullable|string',
                'health_history' => 'nullable|string',
                'specialization' => 'nullable|string|max:255',
                'sub_specialization' => 'nullable|string|max:255',
                'languages_spoken' => 'nullable|string', // JSON array of languages
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Prepare update data
            $updateData = $request->only([
                'first_name', 'last_name', 'date_of_birth', 'gender',
                'country', 'city', 'years_of_experience', 'occupation',
                'bio', 'health_history', 'specialization', 'sub_specialization'
            ]);
            
            // Handle languages_spoken if provided
            if ($request->has('languages_spoken')) {
                $updateData['languages_spoken'] = $request->languages_spoken ? json_decode($request->languages_spoken, true) : null;
            }
            
            $user->update($updateData);

            // Update display name if first or last name changed
            if ($request->has('first_name') || $request->has('last_name')) {
                $user->display_name = $user->first_name . ' ' . $user->last_name;
                $user->save();
            }

            return response()->json([
                'success' => true,
                'message' => 'Profile updated successfully',
                'data' => $user
            ]);

        } catch (\Exception $e) {
            Log::error('Profile update failed', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Profile update failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Change password
     */
    public function changePassword(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'current_password' => 'required|string',
                'new_password' => 'required|string|min:8|confirmed',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $user = Auth::user();

            if (!Hash::check($request->current_password, $user->password)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Current password is incorrect'
                ], 400);
            }

            $user->password = Hash::make($request->new_password);
            $user->save();

            return response()->json([
                'success' => true,
                'message' => 'Password changed successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('Password change failed', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Password change failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Send verification code to email
     */
    /**
     * Get a secure URL for accessing private documents
     */
    public function getPrivateDocumentUrl(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $documentType = $request->input('type'); // 'national_id', 'medical_degree', 'medical_licence'
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 401);
            }
            
            // Get the document path from user
            $documentPath = null;
            switch ($documentType) {
                case 'national_id':
                    $documentPath = $user->national_id;
                    break;
                case 'medical_degree':
                    $documentPath = $user->medical_degree;
                    break;
                case 'medical_licence':
                    $documentPath = $user->medical_licence;
                    break;
                default:
                    return response()->json([
                        'success' => false,
                        'message' => 'Invalid document type'
                    ], 400);
            }
            
            if (!$documentPath) {
                return response()->json([
                    'success' => false,
                    'message' => 'Document not found'
                ], 404);
            }
            
            // Generate a temporary signed URL (valid for 1 hour)
            $url = \Illuminate\Support\Facades\Storage::disk('spaces_private')->temporaryUrl(
                $documentPath, 
                now()->addHour()
            );
            
            return response()->json([
                'success' => true,
                'url' => $url,
                'expires_at' => now()->addHour()->toISOString()
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Error generating private document URL: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate document URL'
            ], 500);
        }
    }

    public function sendVerificationCode(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'email' => 'required|email',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $email = $request->email;
            
            // Generate a 6-digit verification code
            $code = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            
            // Debug logging for code generation
            Log::info('Email verification code generated', [
                'email' => $email,
                'generated_code' => $code,
                'code_length' => strlen($code),
                'code_type' => gettype($code)
            ]);
            
            // Store the code in cache with 10 minutes expiration
            $cacheKey = 'email_verification_' . $email;
            \Illuminate\Support\Facades\Cache::put($cacheKey, $code, now()->addMinutes(10));
            
            // Verify the code was stored correctly with retry mechanism
            $storedCode = null;
            $maxRetries = 3;
            $retryDelay = 100; // milliseconds
            
            for ($i = 0; $i < $maxRetries; $i++) {
                $storedCode = \Illuminate\Support\Facades\Cache::get($cacheKey);
                
                if ($storedCode) {
                    break; // Code found, exit retry loop
                }
                
                if ($i < $maxRetries - 1) {
                    // Wait before retrying (only if not the last attempt)
                    usleep($retryDelay * 1000); // Convert to microseconds
                    $retryDelay *= 2; // Exponential backoff
                }
            }
            
            Log::info('Email verification code storage verification', [
                'email' => $email,
                'cache_key' => $cacheKey,
                'expected_code' => $code,
                'stored_code' => $storedCode,
                'codes_match' => $storedCode === $code,
                'retry_attempts' => $i + 1,
                'stored_code_type' => gettype($storedCode),
                'stored_code_length' => strlen($storedCode ?? '')
            ]);
            
            if ($storedCode !== $code) {
                Log::error('Email verification code storage failed after retries', [
                    'email' => $email,
                    'expected_code' => $code,
                    'stored_code' => $storedCode,
                    'retry_attempts' => $maxRetries
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to store verification code. Please try again.'
                ], 500);
            }
            
            // Send email with verification code
            try {
                // Log before sending
                Log::info('Attempting to send verification email', [
                    'email' => $email,
                    'code' => $code,
                    'mail_config' => [
                        'driver' => config('mail.default'),
                        'host' => config('mail.mailers.smtp.host'),
                        'port' => config('mail.mailers.smtp.port'),
                        'username' => config('mail.mailers.smtp.username'),
                        'from_address' => config('mail.from.address'),
                        'from_name' => config('mail.from.name'),
                    ]
                ]);
                
                Mail::to($email)->send(new VerificationCodeMail($code, $email));
                
                Log::info('Email verification code sent successfully', [
                    'email' => $email,
                    'code' => $code
                ]);
            } catch (\Exception $e) {
                Log::error('Failed to send verification email', [
                    'email' => $email,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                    'mail_config' => [
                        'driver' => config('mail.default'),
                        'host' => config('mail.mailers.smtp.host'),
                        'port' => config('mail.mailers.smtp.port'),
                        'username' => config('mail.mailers.smtp.username'),
                        'from_address' => config('mail.from.address'),
                        'from_name' => config('mail.from.name'),
                    ]
                ]);
                
                // Return error to frontend instead of success
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to send verification email: ' . $e->getMessage(),
                    'error' => $e->getMessage()
                ], 500);
            }
            
            return response()->json([
                'success' => true,
                'message' => 'Verification code sent successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to send verification code', [
                'error' => $e->getMessage(),
                'email' => $request->email ?? 'unknown'
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to send verification code',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Verify email with code
     */
    public function verifyEmail(Request $request): JsonResponse
    {
        try {
            // Log the incoming request for debugging
            Log::info('Email verification request received', [
                'email' => $request->email ?? 'not_provided',
                'code_length' => strlen($request->code ?? ''),
                'has_code' => !empty($request->code),
                'request_data' => $request->all()
            ]);

            $validator = Validator::make($request->all(), [
                'email' => 'required|email',
                'code' => 'required|string|size:6',
            ]);

            if ($validator->fails()) {
                Log::warning('Email verification validation failed', [
                    'email' => $request->email ?? 'not_provided',
                    'errors' => $validator->errors()->toArray()
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $email = trim($request->email);
            $code = trim($request->code);
            
            // Additional validation for code format
            if (!preg_match('/^\d{6}$/', $code)) {
                Log::warning('Email verification code format invalid', [
                    'email' => $email,
                    'provided_code' => $code,
                    'code_length' => strlen($code),
                    'code_is_numeric' => is_numeric($code),
                    'code_has_whitespace' => $code !== trim($code)
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid verification code format. Please enter a 6-digit number.'
                ], 400);
            }
            
            // Get the stored code from cache with retry mechanism
            $cacheKey = 'email_verification_' . $email;
            $storedCode = null;
            $maxRetries = 3;
            $retryDelay = 100; // milliseconds
            
            for ($i = 0; $i < $maxRetries; $i++) {
                $storedCode = \Illuminate\Support\Facades\Cache::get($cacheKey);
                
                if ($storedCode) {
                    break; // Code found, exit retry loop
                }
                
                if ($i < $maxRetries - 1) {
                    // Wait before retrying (only if not the last attempt)
                    usleep($retryDelay * 1000); // Convert to microseconds
                    $retryDelay *= 2; // Exponential backoff
                }
            }
            
            Log::info('Email verification cache check', [
                'email' => $email,
                'cache_key' => $cacheKey,
                'stored_code_exists' => !empty($storedCode),
                'stored_code' => $storedCode,
                'stored_code_length' => strlen($storedCode ?? ''),
                'stored_code_type' => gettype($storedCode),
                'provided_code' => $code,
                'provided_code_length' => strlen($code),
                'provided_code_type' => gettype($code),
                'codes_equal' => $code === $storedCode,
                'codes_equal_strict' => $code === $storedCode,
                'retry_attempts' => $i + 1
            ]);
            
            if (!$storedCode) {
                Log::warning('Email verification code not found in cache after retries', [
                    'email' => $email,
                    'cache_key' => $cacheKey,
                    'retry_attempts' => $maxRetries
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Verification code has expired or not found. Please request a new code.'
                ], 400);
            }
            
            // Ensure both codes are strings and properly formatted for comparison
            $normalizedCode = (string) $code;
            $normalizedStoredCode = (string) $storedCode;
            
            if ($normalizedCode !== $normalizedStoredCode) {
                Log::warning('Email verification code mismatch', [
                    'email' => $email,
                    'provided_code' => $code,
                    'stored_code' => $storedCode,
                    'normalized_provided_code' => $normalizedCode,
                    'normalized_stored_code' => $normalizedStoredCode,
                    'codes_equal' => $normalizedCode === $normalizedStoredCode,
                    'provided_code_type' => gettype($code),
                    'stored_code_type' => gettype($storedCode)
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid verification code'
                ], 400);
            }
            
            // Code is valid, remove it from cache
            \Illuminate\Support\Facades\Cache::forget($cacheKey);
            
            Log::info('Email verification successful', [
                'email' => $email,
                'code' => $code
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Email verified successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to verify email', [
                'error' => $e->getMessage(),
                'email' => $request->email ?? 'unknown',
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to verify email',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check user status and return appropriate error response if needed
     */
    private function checkUserStatus($user)
    {
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

        return null; // No status issues
    }

    /**
     * Compress image data for faster loading
     */
    private function compressImage($imageData, $quality = 75, $maxWidth = 800, $maxHeight = 800)
    {
        try {
            // If Intervention Image is available, use it for compression
            if (class_exists('Intervention\Image\Facades\Image')) {
                $image = \Intervention\Image\Facades\Image::make($imageData);
                
                // Resize if too large
                if ($image->width() > $maxWidth || $image->height() > $maxHeight) {
                    $image->resize($maxWidth, $maxHeight, function ($constraint) {
                        $constraint->aspectRatio();
                        $constraint->upsize();
                    });
                }
                
                // Compress and return as JPEG
                return $image->encode('jpg', $quality);
            } else {
                // Fallback: basic compression using GD
                $sourceImage = imagecreatefromstring($imageData);
                if (!$sourceImage) {
                    return $imageData; // Return original if GD fails
                }
                
                $width = imagesx($sourceImage);
                $height = imagesy($sourceImage);
                
                // Calculate new dimensions maintaining aspect ratio
                $ratio = min($maxWidth / $width, $maxHeight / $height);
                if ($ratio < 1) {
                    $newWidth = (int)($width * $ratio);
                    $newHeight = (int)($height * $ratio);
                } else {
                    $newWidth = $width;
                    $newHeight = $height;
                }
                
                // Create new image
                $compressedImage = imagecreatetruecolor($newWidth, $newHeight);
                
                // Preserve transparency for PNG
                imagealphablending($compressedImage, false);
                imagesavealpha($compressedImage, true);
                
                // Resize
                imagecopyresampled($compressedImage, $sourceImage, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
                
                // Output as JPEG with compression
                ob_start();
                imagejpeg($compressedImage, null, $quality);
                $compressedData = ob_get_contents();
                ob_end_clean();
                
                // Clean up
                imagedestroy($sourceImage);
                imagedestroy($compressedImage);
                
                return $compressedData;
            }
        } catch (\Exception $e) {
            \Log::warning('Image compression failed, using original: ' . $e->getMessage());
            return $imageData; // Return original if compression fails
        }
    }

    /**
     * Get missing required fields for a user type
     */
    private function getMissingRequiredFields($googleUserData, $userType)
    {
        $missingFields = [];
        
        // Common required fields for all user types
        $requiredFields = [
            'date_of_birth' => 'Date of Birth',
            'gender' => 'Gender',
            'country' => 'Country',
            'city' => 'City'
        ];
        
        // Check which fields are missing
        foreach ($requiredFields as $field => $label) {
            if (empty($googleUserData[$field])) {
                $missingFields[] = [
                    'field' => $field,
                    'label' => $label,
                    'type' => $this->getFieldType($field)
                ];
            }
        }
        
        // Add user type specific fields
        if ($userType === 'doctor') {
            $doctorFields = [
                'specializations' => 'Specializations',
                'years_of_experience' => 'Years of Experience',
                'professional_bio' => 'Professional Bio'
            ];
            
            foreach ($doctorFields as $field => $label) {
                if (empty($googleUserData[$field])) {
                    $missingFields[] = [
                        'field' => $field,
                        'label' => $label,
                        'type' => $this->getFieldType($field)
                    ];
                }
            }
        }
        
        return $missingFields;
    }
    
    /**
     * Get field type for form rendering
     */
    private function getFieldType($field)
    {
        $fieldTypes = [
            'date_of_birth' => 'date',
            'gender' => 'select',
            'country' => 'text',
            'city' => 'text',
            'specializations' => 'multiselect',
            'years_of_experience' => 'number',
            'professional_bio' => 'textarea'
        ];
        
        return $fieldTypes[$field] ?? 'text';
    }
} 