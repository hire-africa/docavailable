<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Carbon\Carbon;

class HandleTimezone
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Illuminate\Http\Response|\Illuminate\Http\RedirectResponse)  $next
     * @return \Illuminate\Http\Response|\Illuminate\Http\RedirectResponse
     */
    public function handle(Request $request, Closure $next)
    {
        // Get user timezone from request header
        $userTimezone = $request->header('X-User-Timezone');
        
        if ($userTimezone) {
            // Validate timezone
            try {
                Carbon::now($userTimezone);
                // Store timezone in request for use in controllers
                $request->merge(['user_timezone' => $userTimezone]);
            } catch (\Exception $e) {
                \Log::warning('Invalid timezone provided', [
                    'timezone' => $userTimezone,
                    'error' => $e->getMessage()
                ]);
            }
        }
        
        return $next($request);
    }
}
