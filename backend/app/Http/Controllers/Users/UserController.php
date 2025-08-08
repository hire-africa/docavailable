<?php
namespace App\Http\Controllers\Users;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Subscription;
use App\Traits\HasImageUrls;

class UserController extends Controller
{
    use HasImageUrls;

    public function subscription(Request $request)
    {
        $user = User::find(auth()->user()->id);
        $subscription = $user->subscription;
        
        if (!$subscription) {
            return response()->json([
                'success' => true,
                'data' => null,
                'message' => 'No subscription found'
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $subscription->id,
                'plan_id' => $subscription->plan_id,
                'planName' => $subscription->plan_name,
                'plan_price' => $subscription->plan_price,
                'plan_currency' => $subscription->plan_currency,
                'textSessionsRemaining' => $subscription->text_sessions_remaining,
                'voiceCallsRemaining' => $subscription->voice_calls_remaining,
                'videoCallsRemaining' => $subscription->video_calls_remaining,
                'totalTextSessions' => $subscription->total_text_sessions,
                'totalVoiceCalls' => $subscription->total_voice_calls,
                'totalVideoCalls' => $subscription->total_video_calls,
                'activatedAt' => $subscription->activated_at,
                'expiresAt' => $subscription->expires_at,
                'isActive' => $subscription->is_active,
                'status' => $subscription->status,
                'start_date' => $subscription->start_date,
                'end_date' => $subscription->end_date
            ]
        ]);
    }

    public function create_subscription(Request $request)
    {
        $request->validate([
            'plan_id' => 'required|integer|exists:plans,id',
            'plan_name' => 'required|string',
            'plan_price' => 'required|integer|min:0',
            'plan_currency' => 'required|string|size:3',
            'text_sessions_remaining' => 'required|integer|min:0',
            'voice_calls_remaining' => 'required|integer|min:0',
            'video_calls_remaining' => 'required|integer|min:0',
            'total_text_sessions' => 'required|integer|min:0',
            'total_voice_calls' => 'required|integer|min:0',
            'total_video_calls' => 'required|integer|min:0',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'status' => 'required|string|in:active,inactive,expired',
            'is_active' => 'required|boolean',
            'activated_at' => 'required|date',
            'payment_transaction_id' => 'nullable|string',
            'payment_gateway' => 'nullable|string',
            'payment_status' => 'nullable|string|in:pending,completed,failed',
            'payment_metadata' => 'nullable|array'
        ]);

        $user = $request->user();

        // Check if user already has an active subscription
        $existingSubscription = Subscription::where('user_id', $user->id)
            ->where('is_active', true)
            ->first();

        if ($existingSubscription) {
            // Add sessions to existing subscription instead of creating a new one
            $existingSubscription->text_sessions_remaining += $request->text_sessions_remaining;
            $existingSubscription->voice_calls_remaining += $request->voice_calls_remaining;
            $existingSubscription->video_calls_remaining += $request->video_calls_remaining;
            $existingSubscription->total_text_sessions += $request->total_text_sessions;
            $existingSubscription->total_voice_calls += $request->total_voice_calls;
            $existingSubscription->total_video_calls += $request->total_video_calls;
            $existingSubscription->save();

            \Log::info('Sessions added to existing subscription:', [
                'subscription_id' => $existingSubscription->id,
                'user_id' => $user->id,
                'plan_id' => $request->plan_id,
                'added_text_sessions' => $request->text_sessions_remaining,
                'added_voice_calls' => $request->voice_calls_remaining,
                'added_video_calls' => $request->video_calls_remaining
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Sessions added to existing subscription successfully',
                'data' => $existingSubscription
            ]);
        }

        try {
            // Convert status string to integer
            $statusInt = $request->status === 'active' ? 1 : ($request->status === 'inactive' ? 0 : 2);
            
            // Log the data being created
            \Log::info('Creating subscription with data:', [
                'user_id' => $user->id,
                'plan_id' => $request->plan_id,
                'plan_name' => $request->plan_name,
                'plan_price' => $request->plan_price,
                'plan_currency' => $request->plan_currency,
                'text_sessions_remaining' => $request->text_sessions_remaining,
                'voice_calls_remaining' => $request->voice_calls_remaining,
                'video_calls_remaining' => $request->video_calls_remaining,
                'total_text_sessions' => $request->total_text_sessions,
                'total_voice_calls' => $request->total_voice_calls,
                'total_video_calls' => $request->total_video_calls,
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
                'status' => $statusInt,
                'is_active' => $request->is_active,
                'activated_at' => $request->activated_at,
                'payment_transaction_id' => $request->payment_transaction_id,
                'payment_gateway' => $request->payment_gateway,
                'payment_status' => $request->payment_status
            ]);
            
            $subscription = Subscription::create([
                'user_id' => $user->id,
                'plan_id' => $request->plan_id,
                'plan_name' => $request->plan_name,
                'plan_price' => $request->plan_price,
                'plan_currency' => $request->plan_currency,
                'text_sessions_remaining' => $request->text_sessions_remaining,
                'voice_calls_remaining' => $request->voice_calls_remaining,
                'video_calls_remaining' => $request->video_calls_remaining,
                'total_text_sessions' => $request->total_text_sessions,
                'total_voice_calls' => $request->total_voice_calls,
                'total_video_calls' => $request->total_video_calls,
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
                'status' => $statusInt,
                'is_active' => $request->is_active,
                'activated_at' => $request->activated_at,
                'payment_transaction_id' => $request->payment_transaction_id,
                'payment_gateway' => $request->payment_gateway,
                'payment_status' => $request->payment_status ?? 'pending',
                'payment_metadata' => $request->payment_metadata
            ]);

            \Log::info('Subscription created successfully:', ['subscription_id' => $subscription->id]);

            return response()->json([
                'success' => true,
                'message' => 'Subscription created successfully',
                'data' => $subscription
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to create subscription:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => $user->id,
                'plan_id' => $request->plan_id
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to create subscription: ' . $e->getMessage(),
                'error_details' => config('app.debug') ? $e->getTraceAsString() : null
            ], 500);
        }
    }

    public function update_subscription(Request $request)
    {
        $request->validate([
            'plan_id' => 'required|integer|exists:plans,id',
        ]);
        $user = User::find(auth()->user()->id);
        $user->subscription()->update([
            'plan_id' => $request->plan_id,
            'status' => 1,
        ]);
        return response()->json($user->subscription);
    }

    public function getUserById($id)
    {
        try {
            $user = User::find($id);
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not found'
                ], 404);
            }

            // Generate full URLs for images if they exist
            $userData = $this->generateImageUrls($user);

            // Add additional fields that might not be in the trait
            $userData['specialization'] = $user->specialization;
            $userData['years_of_experience'] = $user->years_of_experience;
            $userData['bio'] = $user->bio;
            $userData['city'] = $user->city;
            $userData['country'] = $user->country;
            $userData['status'] = $user->status;
            $userData['rating'] = $user->rating;
            $userData['total_ratings'] = $user->total_ratings;

            return response()->json([
                'success' => true,
                'data' => $userData
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch user: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getPatientSubscription($patientId)
    {
        try {
            $subscription = Subscription::where('user_id', $patientId)
                ->where('is_active', true)
                ->first();

            if (!$subscription) {
                return response()->json([
                    'success' => true,
                    'data' => null,
                    'message' => 'No active subscription found'
                ]);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $subscription->id,
                    'plan_id' => $subscription->plan_id,
                    'plan_name' => $subscription->plan_name,
                    'plan_price' => $subscription->plan_price,
                    'plan_currency' => $subscription->plan_currency,
                    'textSessionsRemaining' => $subscription->text_sessions_remaining,
                    'voiceCallsRemaining' => $subscription->voice_calls_remaining,
                    'videoCallsRemaining' => $subscription->video_calls_remaining,
                    'totalTextSessions' => $subscription->total_text_sessions,
                    'totalVoiceCalls' => $subscription->total_voice_calls,
                    'totalVideoCalls' => $subscription->total_video_calls,
                    'activatedAt' => $subscription->activated_at,
                    'expiresAt' => $subscription->expires_at,
                    'isActive' => $subscription->is_active
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch subscription: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get active doctors for appointment booking
     */
    public function getActiveDoctors(Request $request)
    {
        try {
            $perPage = $request->get('per_page', 20);
            $search = $request->get('search');
            $specialty = $request->get('specialty');
            
            $query = User::with(['doctorAvailability'])
                ->where('user_type', 'doctor')
                ->where('status', 'approved');
            
            // Apply search filter
            if ($search) {
                $query->where(function($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                      ->orWhere('last_name', 'like', "%{$search}%")
                      ->orWhere('display_name', 'like', "%{$search}%")
                      ->orWhere('specialization', 'like', "%{$search}%");
                });
            }
            
            // Apply specialty filter
            if ($specialty) {
                $query->where('specialization', 'like', "%{$specialty}%");
            }
            
            $doctors = $query->select([
                'id',
                'first_name',
                'last_name',
                'display_name',
                'email',
                'specialization',
                'years_of_experience',
                'bio',
                'rating',
                'total_ratings',
                'city',
                'country',
                'status',
                'profile_picture'
            ])
            ->orderBy('rating', 'desc')
            ->orderBy('years_of_experience', 'desc')
            ->paginate($perPage);
            
            // Add profile picture URLs and availability info to each doctor
            $doctors->getCollection()->transform(function ($doctor) {
                $doctorData = $doctor->toArray();
                
                // Add profile picture URL
                if ($doctor->profile_picture) {
                    $doctorData['profile_picture_url'] = \Illuminate\Support\Facades\Storage::disk('public')->url($doctor->profile_picture);
                }
                
                // Add availability info
                if ($doctor->doctorAvailability) {
                    $doctorData['is_online'] = $doctor->doctorAvailability->is_online;
                    $doctorData['working_hours'] = json_decode($doctor->doctorAvailability->working_hours, true);
                    $doctorData['max_patients_per_day'] = $doctor->doctorAvailability->max_patients_per_day;
                }
                
                return $doctorData;
            });
            
            return $this->success($doctors, 'Active doctors fetched successfully');
        } catch (\Exception $e) {
            \Log::error('Error fetching active doctors:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return $this->error('Failed to fetch active doctors: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get user's online status
     */
    public function getOnlineStatus(Request $request, $userId)
    {
        try {
            $user = User::find($userId);
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not found'
                ], 404);
            }

            // For now, we'll use a simple approach based on last activity
            // You can enhance this with more sophisticated logic later
            $isOnline = false;
            
            // Check if user has been active in the last 5 minutes
            if ($user->last_online_at) {
                $lastActivity = \Carbon\Carbon::parse($user->last_online_at);
                $isOnline = $lastActivity->diffInMinutes(now()) < 5;
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'user_id' => $user->id,
                    'is_online' => $isOnline,
                    'last_online_at' => $user->last_online_at
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get online status: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update user's online status
     */
    public function updateOnlineStatus(Request $request)
    {
        try {
            $user = $request->user();
            
            $user->update([
                'last_online_at' => now()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Online status updated successfully',
                'data' => [
                    'user_id' => $user->id,
                    'last_online_at' => $user->last_online_at
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update online status: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Test endpoint to manually set user as online (for testing)
     */
    public function setUserOnline(Request $request, $userId)
    {
        try {
            $user = User::find($userId);
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not found'
                ], 404);
            }

            $user->update([
                'last_online_at' => now()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'User set as online successfully',
                'data' => [
                    'user_id' => $user->id,
                    'last_online_at' => $user->last_online_at
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to set user online: ' . $e->getMessage()
            ], 500);
        }
    }
}
