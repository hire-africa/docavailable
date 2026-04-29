<?php

namespace App\Http\Middleware;

use App\Models\UserSession;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSessionIsActive
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        try {
            $user = auth('api')->user();
            $payload = auth('api')->payload();

            if (!$user || !$payload) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthenticated',
                ], 401);
            }

            $jti = (string) $payload->get('jti');
            if (!$jti) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid token payload',
                ], 401);
            }

            $session = UserSession::where('user_id', $user->id)->where('jti', $jti)->first();

            // Backward compatibility: auto-register session for tokens issued before this feature.
            if (!$session) {
                UserSession::create([
                    'user_id' => $user->id,
                    'jti' => $jti,
                    'device_name' => $this->deviceNameFromUserAgent((string) $request->userAgent()),
                    'platform' => $this->platformFromUserAgent((string) $request->userAgent()),
                    'browser' => $this->browserFromUserAgent((string) $request->userAgent()),
                    'ip_address' => $request->ip(),
                    'user_agent' => (string) $request->userAgent(),
                    'last_seen_at' => now(),
                    'expires_at' => now()->addDays(7),
                ]);
            } else {
                if ($session->revoked_at || ($session->expires_at && $session->expires_at->isPast())) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Session has been revoked. Please log in again.',
                    ], 401);
                }

                // lightweight heartbeat
                $session->update([
                    'last_seen_at' => now(),
                    'ip_address' => $request->ip(),
                ]);
            }
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Session validation failed',
            ], 401);
        }

        return $next($request);
    }

    private function platformFromUserAgent(string $ua): string
    {
        $s = strtolower($ua);
        if (str_contains($s, 'windows')) return 'Windows';
        if (str_contains($s, 'mac os') || str_contains($s, 'macintosh')) return 'macOS';
        if (str_contains($s, 'iphone') || str_contains($s, 'ios')) return 'iOS';
        if (str_contains($s, 'android')) return 'Android';
        if (str_contains($s, 'linux')) return 'Linux';
        return 'Unknown OS';
    }

    private function browserFromUserAgent(string $ua): string
    {
        $s = strtolower($ua);
        if (str_contains($s, 'edg/')) return 'Edge';
        if (str_contains($s, 'firefox')) return 'Firefox';
        if (str_contains($s, 'safari') && !str_contains($s, 'chrome')) return 'Safari';
        if (str_contains($s, 'chrome')) return 'Chrome';
        return 'Browser';
    }

    private function deviceNameFromUserAgent(string $ua): string
    {
        $platform = $this->platformFromUserAgent($ua);
        $browser = $this->browserFromUserAgent($ua);
        return trim($browser . ' on ' . $platform);
    }
}

