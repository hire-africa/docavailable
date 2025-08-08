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
use App\Traits\HasImageUrls;

class AuthenticationController extends Controller
{
    use HasImageUrls;

    /**
     * Create a new controller instance.
     */
    public function __construct()
    {
        $this->middleware('auth:api', ['except' => ['login', 'register']]);
    }

    /**
     * Register a new user
     */
    public function register(Request $request): JsonResponse
    {
        try {
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
                'occupation' => 'nullable|string|max:255',
                'bio' => 'nullable|string',
                'health_history' => 'nullable|string',
                'dob' => 'nullable|date',
                'surname' => 'nullable|string|max:255',
                'specialization' => 'nullable|string|max:255',
                'sub_specialization' => 'nullable|string|max:255',
                'specializations' => 'nullable|string', // JSON array of specializations
                'profile_picture' => 'nullable|string', // Base64 encoded
                'national_id' => 'nullable|string', // Base64 encoded
                'medical_degree' => 'nullable|string', // Base64 encoded
                'medical_licence' => 'nullable|string', // Base64 encoded
            ]);

            // Add custom validation rule to require either last_name or surname
            $validator->after(function ($validator) use ($request) {
                if (!$request->last_name && !$request->surname) {
                    $validator->errors()->add('last_name', 'The last name field is required.');
                }
            });

            if ($validator->fails()) {
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
                    $filename = \Illuminate\Support\Str::uuid() . '.jpg';
                    \Illuminate\Support\Facades\Storage::disk('public')->put('profile-pictures/' . $filename, $image);
                    $profilePicturePath = 'profile-pictures/' . $filename;
                }
            }

            // Handle document uploads for doctors
            $nationalIdPath = null;
            $medicalDegreePath = null;
            $medicalLicencePath = null;

            if ($request->user_type === 'doctor') {
                // Handle national ID
                if ($request->national_id) {
                    $image = preg_replace('/^data:image\/\w+;base64,/', '', $request->national_id);
                    $image = base64_decode($image);
                    
                    if ($image && strlen($image) > 100) { // Reduced to 100 bytes for uncompressed images
                        $filename = \Illuminate\Support\Str::uuid() . '_national_id.jpg';
                        \Illuminate\Support\Facades\Storage::disk('public')->put('documents/' . $filename, $image);
                        $nationalIdPath = 'documents/' . $filename;
                    }
                }

                // Handle medical degree
                if ($request->medical_degree) {
                    $image = preg_replace('/^data:image\/\w+;base64,/', '', $request->medical_degree);
                    $image = base64_decode($image);
                    
                    if ($image && strlen($image) > 100) { // Reduced to 100 bytes for uncompressed images
                        $filename = \Illuminate\Support\Str::uuid() . '_medical_degree.jpg';
                        \Illuminate\Support\Facades\Storage::disk('public')->put('documents/' . $filename, $image);
                        $medicalDegreePath = 'documents/' . $filename;
                    }
                }

                // Handle medical licence (optional)
                if ($request->medical_licence) {
                    $image = preg_replace('/^data:image\/\w+;base64,/', '', $request->medical_licence);
                    $image = base64_decode($image);
                    
                    if ($image && strlen($image) > 100) { // Reduced to 100 bytes for uncompressed images
                        $filename = \Illuminate\Support\Str::uuid() . '_medical_licence.jpg';
                        \Illuminate\Support\Facades\Storage::disk('public')->put('documents/' . $filename, $image);
                        $medicalLicencePath = 'documents/' . $filename;
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
                'occupation' => $request->occupation,
                'bio' => $request->bio,
                'health_history' => $request->health_history,
                'status' => $request->user_type === 'doctor' ? 'pending' : 'active',
                'rating' => 0,
                'total_ratings' => 0,
                'profile_picture' => $profilePicturePath,
                'specialization' => $request->specialization,
                'sub_specialization' => $request->sub_specialization,
                'specializations' => $request->specializations ? json_decode($request->specializations, true) : null,
                'national_id' => $nationalIdPath,
                'medical_degree' => $medicalDegreePath,
                'medical_licence' => $medicalLicencePath,
            ]);

            // Generate JWT token
            $token = auth('api')->login($user);

            // Dispatch profile picture processing job if profile picture was uploaded
            if ($profilePicturePath) {
                \App\Jobs\ProcessFileUpload::dispatch($profilePicturePath, 'profile_picture', $user->id);
            }

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
                    
                    return response()->json([
                        'success' => false,
                        'message' => 'Invalid password. Please check your password and try again.',
                        'error_type' => 'invalid_password',
                        'suggestion' => 'Make sure caps lock is off and try again. If you forgot your password, use the forgot password option.'
                    ], 401);
                }
            }

            $user = auth('api')->user();

            // Additional checks after successful authentication
            if ($user->status === 'suspended') {
                auth('api')->logout();
                return response()->json([
                    'success' => false,
                    'message' => 'Your account has been suspended. Please contact support for assistance.',
                    'error_type' => 'account_suspended',
                    'suggestion' => 'Contact our support team to reactivate your account.'
                ], 403);
            }

            if ($user->user_type === 'doctor' && $user->status === 'pending') {
                auth('api')->logout();
                return response()->json([
                    'success' => false,
                    'message' => 'Your account is pending approval. Please wait for admin approval.',
                    'error_type' => 'account_pending',
                    'suggestion' => 'You will receive an email notification once your account is approved.'
                ], 403);
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
            $validator = Validator::make($request->all(), [
                'id_token' => 'required|string',
            ]);

            if ($validator->fails()) {
                $errors = $validator->errors();
                $errorMessages = [];
                $detailedMessage = 'Please provide a valid Google ID token.';
                
                if ($errors->has('id_token')) {
                    $errorMessages['id_token'] = 'Google ID token is required.';
                    $detailedMessage = 'Google authentication token is missing or invalid.';
                }
                
                return response()->json([
                    'success' => false,
                    'message' => $detailedMessage,
                    'errors' => $errorMessages,
                    'error_type' => 'validation_error'
                ], 422);
            }

            $idToken = $request->input('id_token');

            // Verify Google ID token using Firebase Admin SDK
            $verifiedIdToken = $this->verifyGoogleIdToken($idToken);
            
            if (!$verifiedIdToken) {
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

            // Check if user exists
            $user = User::where('email', $email)->first();

            if (!$user) {
                // Create new user from Google data
                $user = User::create([
                    'email' => $email,
                    'first_name' => $googleUser['given_name'] ?? '',
                    'last_name' => $googleUser['family_name'] ?? '',
                    'display_name' => $googleUser['name'] ?? ($googleUser['given_name'] . ' ' . $googleUser['family_name']),
                    'user_type' => 'patient', // Default to patient, can be changed later
                    'status' => 'active',
                    'google_id' => $googleId,
                    'email_verified_at' => now(), // Google emails are verified
                ]);
            } else {
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
                
                // Update existing user with Google ID if not set
                if (!$user->google_id) {
                    $user->update([
                        'google_id' => $googleId,
                        'email_verified_at' => now(),
                    ]);
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
            // For now, we'll use a simple approach
            // In production, you should use Firebase Admin SDK or Google's official library
            
            // Decode the JWT token (this is a simplified version)
            $tokenParts = explode('.', $idToken);
            if (count($tokenParts) !== 3) {
                return false;
            }

            $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $tokenParts[1])), true);
            
            // Basic validation
            if (!$payload || !isset($payload['email']) || !isset($payload['sub'])) {
                return false;
            }

            // Check if token is not expired
            if (isset($payload['exp']) && $payload['exp'] < time()) {
                return false;
            }

            return $payload;
        } catch (\Exception $e) {
            Log::error('Google ID token verification failed', [
                'error' => $e->getMessage()
            ]);
            return false;
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
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $user->update($request->only([
                'first_name', 'last_name', 'date_of_birth', 'gender',
                'country', 'city', 'years_of_experience', 'occupation',
                'bio', 'health_history', 'specialization', 'sub_specialization'
            ]));

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
} 