<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\EfasheService;
use App\Models\User;

class PhoneAuthController extends Controller
{
    protected $efashe;

    public function __construct(EfasheService $efashe)
    {
        $this->efashe = $efashe;
    }

    // Step 1: Send OTP
    public function sendOtp(Request $request)
    {
        $request->validate([
            'phone' => 'required|string'
        ]);

        $result = $this->efashe->sendOtp($request->phone);

        return response()->json($result);
    }

    // Step 2: Verify OTP
    public function verifyOtp(Request $request)
    {
        $request->validate([
            'phone' => 'required|string',
            'otp' => 'required|string'
        ]);

        $verify = $this->efashe->verifyOtp($request->phone, $request->otp);

        if (!isset($verify['success']) || !$verify['success']) {
            return response()->json(['success' => false, 'message' => 'Invalid OTP'], 401);
        }

        // Find or create user
        $user = User::firstOrCreate(
            ['phone' => $request->phone],
            ['name' => 'User'] // default name, adjust as needed based on your User model
        );

        // Check if createToken method exists (Sanctum)
        if (method_exists($user, 'createToken')) {
            $token = $user->createToken('api-token')->plainTextToken;
        } else {
            // Fallback or JWT handling if Sanctum is not used/configured this way
            // Assuming Sanctum is available based on composer.json
            $token = null;
        }


        // Since the User model might not have 'phone' or 'name' fillable or even existing columns based on the previous view of User.php,
        // we need to be careful. The User.php viewed earlier had 'email' but not explicitly 'phone' in $fillable.
        // It had 'firebase_uid', 'google_id', etc.
        // I should check if 'phone' is in the User model.

        return response()->json([
            'success' => true,
            'token' => $token,
            'user' => $user
        ]);
    }
}
