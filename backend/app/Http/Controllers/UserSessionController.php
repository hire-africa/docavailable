<?php

namespace App\Http\Controllers;

use App\Models\UserSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class UserSessionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        $currentJti = $this->currentJti();

        $sessions = UserSession::where('user_id', $user->id)
            ->active()
            ->orderByDesc('last_seen_at')
            ->get()
            ->map(function (UserSession $session) use ($currentJti) {
                return [
                    'id' => $session->id,
                    'title' => $session->jti === $currentJti ? 'Current Session' : trim(($session->browser ?: 'Browser') . ' on ' . ($session->platform ?: 'Unknown OS')),
                    'subtitle' => trim(($session->device_name ?: 'Unknown Device') . ' • ' . ($session->ip_address ?: 'Unknown Location')),
                    'meta' => $session->last_seen_at ? $session->last_seen_at->diffForHumans() : '',
                    'is_current' => $session->jti === $currentJti,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $sessions,
            'message' => 'Sessions fetched successfully',
        ]);
    }

    public function revoke(Request $request, int $sessionId): JsonResponse
    {
        $user = Auth::user();
        $currentJti = $this->currentJti();

        $session = UserSession::where('user_id', $user->id)->where('id', $sessionId)->first();
        if (!$session) {
            return response()->json([
                'success' => false,
                'message' => 'Session not found',
            ], 404);
        }

        if ($session->jti === $currentJti) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot revoke current session from this endpoint',
            ], 400);
        }

        $session->update(['revoked_at' => now()]);

        return response()->json([
            'success' => true,
            'message' => 'Session revoked successfully',
        ]);
    }

    public function signOutOthers(Request $request): JsonResponse
    {
        $user = Auth::user();
        $currentJti = $this->currentJti();

        UserSession::where('user_id', $user->id)
            ->where('jti', '!=', $currentJti)
            ->whereNull('revoked_at')
            ->update(['revoked_at' => now()]);

        return response()->json([
            'success' => true,
            'message' => 'Signed out of all other sessions',
        ]);
    }

    private function currentJti(): ?string
    {
        try {
            $payload = auth('api')->payload();
            return $payload ? (string) $payload->get('jti') : null;
        } catch (\Throwable $e) {
            return null;
        }
    }
}

