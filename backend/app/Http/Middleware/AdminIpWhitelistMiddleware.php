<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AdminIpWhitelistMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle(Request $request, Closure $next)
    {
        // Get allowed IPs from environment variable
        $allowedIpsString = env('ADMIN_ALLOWED_IPS', '127.0.0.1');
        $allowedIps = array_filter(array_map('trim', explode(',', $allowedIpsString)));

        // Always allow localhost/loopback for internal operations
        if (!in_array('127.0.0.1', $allowedIps)) {
            $allowedIps[] = '127.0.0.1';
        }

        $clientIp = $request->ip();

        if (!in_array($clientIp, $allowedIps)) {
            Log::warning("Unauthorized admin access attempt from IP: {$clientIp}");

            return response()->json([
                'success' => false,
                'message' => 'Unauthorized access. Your IP address is not allowed.'
            ], 403);
        }

        return $next($request);
    }
}
