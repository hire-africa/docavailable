<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CheckAppVersion
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
        // Skip version check for the version-check endpoint itself to avoid catch-22
        if ($request->is('api/app/version-check')) {
            return $next($request);
        }

        $appVersion = $request->header('X-App-Version');
        $platform = $request->header('X-Platform'); // android or ios

        if (!$appVersion || !$platform) {
            // Allow requests without headers (e.g. web, or older versions before this feature)
            // You might want to enforce this later, but for now, pass through.
            return $next($request);
        }

        $platform = strtolower($platform);
        $config = config("mobile_app_version.{$platform}");

        if (!$config) {
            return $next($request);
        }

        if ($config['force_update']) {
            if (version_compare($appVersion, $config['min_version'], '<')) {
                return response()->json([
                    'message' => 'Your app version is outdated. Please update to the latest version.',
                    'update_required' => true,
                    'store_url' => $config['store_url']
                ], 426); // 426 Upgrade Required
            }
        }

        return $next($request);
    }
}
