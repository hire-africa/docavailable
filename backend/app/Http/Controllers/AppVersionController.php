<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class AppVersionController extends Controller
{
    public function checkVersion(Request $request)
    {
        $platform = $request->input('platform');

        // Default to safe values if platform is missing or invalid
        if (!in_array($platform, ['android', 'ios'])) {
            return response()->json([
                'forceUpdate' => false,
                'minVersion' => '0.0.0',
                'title' => 'Update Required',
                'message' => 'Please update your app.',
                'storeUrl' => ''
            ]);
        }

        // Get config for the specific platform
        $config = config("mobile_app_version.{$platform}");

        // Fallback if config is missing
        if (!$config) {
            return response()->json([
                'forceUpdate' => false,
                'minVersion' => '0.0.0',
                'title' => 'Update Required',
                'message' => 'Please update your app.',
                'storeUrl' => ''
            ]);
        }

        return response()->json([
            'minVersion' => $config['min_version'],
            'forceUpdate' => $config['force_update'],
            'storeUrl' => $config['store_url'],
            'title' => $config['title'],
            'message' => $config['message']
        ]);
    }
}
