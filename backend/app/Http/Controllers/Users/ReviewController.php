<?php
namespace App\Http\Controllers\Users;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Reviews;
use App\Http\Requests\ReviewRequest;

class ReviewController extends Controller
{
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
        if (!auth()->user()->isPatient()) {
            return response()->json(['error' => 'Only patients can write reviews'], 403);
        }
        $user = User::find(auth()->user()->id);
        $user->reviews()->create([
            'rating' => $request->rating,
            'comment' => $request->comment,
            'reviewer_id' => $request->reviewer_id,
        ]);
        return response()->json($user->reviews);
    }

    public function update_review(ReviewRequest $request)
    {
        if (!auth()->user()->isPatient()) {
            return response()->json(['error' => 'Only patients can write reviews'], 403);
        }
        $user = User::find(auth()->user()->id);
        $user->reviews()->update([
            'rating' => $request->rating,
            'comment' => $request->comment,
            'reviewer_id' => $request->reviewer_id,
        ]);
        return response()->json($user->reviews);
    }

    public function delete_review($id)
    {
        $review = Reviews::findOrFail($id);
        $review->delete();
        return response()->json(['message' => 'Review deleted successfully']);
    }

    public function createDoctorRating(Request $request, $doctorId, $patientId)
    {
        try {
            $request->validate([
                'rating' => 'required|integer|min:1|max:5',
                'comment' => 'nullable|string|max:500',
                'chatId' => 'required|string'
            ]);

            $user = auth()->user();
            
            // Verify the patient is the one making the request
            if ($user->id != $patientId) {
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
                return response()->json([
                    'success' => false,
                    'message' => 'Rating already exists for this session'
                ], 400);
            }

            $rating = Reviews::create([
                'doctor_id' => $doctorId,
                'patient_id' => $patientId,
                'rating' => $request->rating,
                'comment' => $request->comment,
                'chat_id' => $request->chatId,
                'status' => 'approved'
            ]);

            // Update doctor's average rating
            $doctor = \App\Models\User::find($doctorId);
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

            return response()->json([
                'success' => true,
                'message' => 'Rating submitted successfully',
                'data' => $rating
            ]);
        } catch (\Exception $e) {
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
