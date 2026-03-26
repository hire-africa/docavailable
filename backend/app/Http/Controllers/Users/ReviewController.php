<?php
namespace App\Http\Controllers\Users;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Reviews;
use App\Http\Requests\ReviewRequest;

class ReviewController extends Controller
{
    public function doctor_reviews(Request $request, $id)
    {
        try {
            $limit = (int) $request->query('limit', 10);
            if ($limit <= 0 || $limit > 50) {
                $limit = 10;
            }

            $reviews = Reviews::with(['reviewer'])
                ->where('doctor_id', $id)
                ->where('status', 'approved')
                ->orderBy('created_at', 'desc')
                ->limit($limit)
                ->get()
                ->map(function ($rev) {
                    return [
                        'id' => $rev->id,
                        'rating' => $rev->rating,
                        'comment' => $rev->comment,
                        'created_at' => $rev->created_at,
                        'reviewer' => $rev->reviewer ? [
                            'id' => $rev->reviewer->id,
                            'display_name' => $rev->reviewer->display_name,
                            'first_name' => $rev->reviewer->first_name,
                            'last_name' => $rev->reviewer->last_name,
                            'profile_picture_url' => $rev->reviewer->profile_picture_url,
                        ] : null,
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $reviews
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch doctor reviews: ' . $e->getMessage()
            ], 500);
        }
    }
    public function reviews(Request $request)
    {
        try {
            $user = auth()->user();
            $reviews = $user->reviews()->with('user')->get();

            return response()->json([
                'success' => true,
                'data' => $reviews
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch reviews: ' . $e->getMessage()
            ], 500);
        }
    }

    public function create_review(ReviewRequest $request)
    {
        $doctorId = $request->reviewer_id; // MISMATCH: reviewer_id in request seems to be the doctor ID in old frontend
        $patientId = auth()->id();

        $review = Reviews::create([
            'doctor_id' => $doctorId,
            'user_id' => $doctorId,
            'patient_id' => $patientId,
            'reviewer_id' => $patientId,
            'rating' => $request->rating,
            'comment' => $request->comment,
            'status' => 'approved'
        ]);

        $this->updateDoctorStats($doctorId);

        return response()->json([
            'success' => true,
            'data' => $review
        ]);
    }

    public function update_review(ReviewRequest $request, $id)
    {
        $review = Reviews::findOrFail($id);

        if ($review->reviewer_id !== auth()->id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $review->update([
            'rating' => $request->rating ?? $review->rating,
            'comment' => $request->comment ?? $review->comment,
            'status' => 'approved'
        ]);

        $this->updateDoctorStats($review->doctor_id);

        return response()->json([
            'success' => true,
            'data' => $review
        ]);
    }

    private function updateDoctorStats($doctorId)
    {
        $doctor = User::find($doctorId);
        if ($doctor) {
            $avgRating = Reviews::where('doctor_id', $doctorId)
                ->where('status', 'approved')
                ->avg('rating');

            $totalRatings = Reviews::where('doctor_id', $doctorId)
                ->where('status', 'approved')
                ->count();

            $doctor->update([
                'rating' => round($avgRating, 1),
                'total_ratings' => $totalRatings
            ]);
        }
    }

    public function delete_review($id)
    {
        $review = Reviews::findOrFail($id);
        $doctorId = $review->doctor_id;
        $review->delete();

        if ($doctorId) {
            $this->updateDoctorStats($doctorId);
        }

        return response()->json(['success' => true, 'message' => 'Review deleted successfully']);
    }

    public function createDoctorRating(Request $request, $doctorId, $patientId)
    {
        try {
            \Log::info('🔍 [Rating] Starting rating submission', [
                'doctor_id' => $doctorId,
                'patient_id' => $patientId,
                'rating' => $request->rating,
                'comment' => $request->comment,
                'chat_id' => $request->chatId
            ]);

            $request->validate([
                'rating' => 'required|integer|min:1|max:5',
                'comment' => 'nullable|string|max:500',
                'chatId' => 'required|string'
            ]);

            $user = auth()->user();

            // Verify the patient is the one making the request
            if ($user->id != $patientId) {
                \Log::warning('❌ [Rating] Unauthorized rating attempt', [
                    'user_id' => $user->id,
                    'patient_id' => $patientId
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 403);
            }

            // Check if rating already exists for this chat
            $existingRating = Reviews::where('chat_id', $request->chatId)
                ->where('patient_id', $patientId)
                ->first();

            if ($existingRating) {
                \Log::warning('❌ [Rating] Duplicate rating attempt', [
                    'chat_id' => $request->chatId,
                    'patient_id' => $patientId,
                    'existing_rating_id' => $existingRating->id
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Rating already exists for this session'
                ], 400);
            }

            $rating = Reviews::create([
                'reviewer_id' => $patientId, // The patient is the reviewer
                'user_id' => $doctorId, // The doctor being reviewed
                'doctor_id' => $doctorId,
                'patient_id' => $patientId,
                'rating' => $request->rating,
                'comment' => $request->comment,
                'chat_id' => $request->chatId,
                'status' => 'approved'
            ]);

            \Log::info('✅ [Rating] Rating created successfully', [
                'rating_id' => $rating->id,
                'rating' => $rating->rating
            ]);

            $this->updateDoctorStats($doctorId);

            return response()->json([
                'success' => true,
                'message' => 'Rating submitted successfully',
                'data' => $rating
            ]);
        } catch (\Exception $e) {
            \Log::error('❌ [Rating] Rating submission failed', [
                'error' => $e->getMessage(),
                'doctor_id' => $doctorId,
                'patient_id' => $patientId,
                'rating' => $request->rating ?? 'unknown'
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to submit rating: ' . $e->getMessage()
            ], 500);
        }
    }

    public function checkIfRated($chatId, $patientId)
    {
        try {
            $user = auth()->user();

            // Verify the patient is the one making the request
            if ($user->id != $patientId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 403);
            }

            $rating = Reviews::where('chat_id', $chatId)
                ->where('patient_id', $patientId)
                ->first();

            return response()->json([
                'success' => true,
                'data' => [
                    'has_rated' => $rating !== null,
                    'rating' => $rating
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to check rating: ' . $e->getMessage()
            ], 500);
        }
    }
}
