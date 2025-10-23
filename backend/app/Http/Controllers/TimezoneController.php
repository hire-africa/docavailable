<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TimezoneController extends Controller
{
    /**
     * Get user timezone from IP address
     */
    public function getTimezoneFromIP(Request $request): JsonResponse
    {
        try {
            $ip = $this->getClientIP($request);
            
            if (!$ip || $ip === '127.0.0.1' || $ip === '::1') {
                // For local development, return a default timezone
                return response()->json([
                    'success' => true,
                    'timezone' => 'UTC',
                    'method' => 'default'
                ]);
            }

            // Use a free IP geolocation service
            $response = Http::timeout(5)->get("http://ip-api.com/json/{$ip}");
            
            if ($response->successful()) {
                $data = $response->json();
                
                if (isset($data['timezone'])) {
                    Log::info('Timezone detected from IP', [
                        'ip' => $ip,
                        'timezone' => $data['timezone'],
                        'country' => $data['country'] ?? 'Unknown',
                        'city' => $data['city'] ?? 'Unknown'
                    ]);
                    
                    return response()->json([
                        'success' => true,
                        'timezone' => $data['timezone'],
                        'method' => 'ip_geolocation',
                        'country' => $data['country'] ?? null,
                        'city' => $data['city'] ?? null
                    ]);
                }
            }

            // Fallback to UTC
            return response()->json([
                'success' => true,
                'timezone' => 'UTC',
                'method' => 'fallback'
            ]);

        } catch (\Exception $e) {
            Log::error('Error detecting timezone from IP', [
                'ip' => $ip ?? 'unknown',
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'timezone' => 'UTC',
                'method' => 'error_fallback',
                'error' => 'Failed to detect timezone'
            ]);
        }
    }

    /**
     * Get timezone from coordinates
     */
    public function getTimezoneFromCoordinates(Request $request): JsonResponse
    {
        $request->validate([
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180'
        ]);

        try {
            $latitude = $request->latitude;
            $longitude = $request->longitude;

            // Use timezone API
            $response = Http::timeout(5)->get('https://api.timezonedb.com/v2.1/get-time-zone', [
                'key' => 'demo', // Free tier
                'format' => 'json',
                'by' => 'position',
                'lat' => $latitude,
                'lng' => $longitude
            ]);

            if ($response->successful()) {
                $data = $response->json();
                
                if (isset($data['zoneName'])) {
                    Log::info('Timezone detected from coordinates', [
                        'latitude' => $latitude,
                        'longitude' => $longitude,
                        'timezone' => $data['zoneName']
                    ]);
                    
                    return response()->json([
                        'success' => true,
                        'timezone' => $data['zoneName'],
                        'method' => 'coordinates'
                    ]);
                }
            }

            // Fallback to UTC
            return response()->json([
                'success' => true,
                'timezone' => 'UTC',
                'method' => 'fallback'
            ]);

        } catch (\Exception $e) {
            Log::error('Error detecting timezone from coordinates', [
                'latitude' => $latitude ?? 'unknown',
                'longitude' => $longitude ?? 'unknown',
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'timezone' => 'UTC',
                'method' => 'error_fallback',
                'error' => 'Failed to detect timezone'
            ]);
        }
    }

    /**
     * Get common timezones list
     */
    public function getCommonTimezones(): JsonResponse
    {
        $timezones = [
            // Americas
            ['value' => 'America/New_York', 'label' => 'Eastern Time (US & Canada)', 'offset' => 'UTC-5/-4'],
            ['value' => 'America/Chicago', 'label' => 'Central Time (US & Canada)', 'offset' => 'UTC-6/-5'],
            ['value' => 'America/Denver', 'label' => 'Mountain Time (US & Canada)', 'offset' => 'UTC-7/-6'],
            ['value' => 'America/Los_Angeles', 'label' => 'Pacific Time (US & Canada)', 'offset' => 'UTC-8/-7'],
            ['value' => 'America/Toronto', 'label' => 'Toronto', 'offset' => 'UTC-5/-4'],
            ['value' => 'America/Sao_Paulo', 'label' => 'São Paulo', 'offset' => 'UTC-3'],
            
            // Europe
            ['value' => 'Europe/London', 'label' => 'London', 'offset' => 'UTC+0/+1'],
            ['value' => 'Europe/Paris', 'label' => 'Paris', 'offset' => 'UTC+1/+2'],
            ['value' => 'Europe/Berlin', 'label' => 'Berlin', 'offset' => 'UTC+1/+2'],
            ['value' => 'Europe/Rome', 'label' => 'Rome', 'offset' => 'UTC+1/+2'],
            ['value' => 'Europe/Madrid', 'label' => 'Madrid', 'offset' => 'UTC+1/+2'],
            ['value' => 'Europe/Amsterdam', 'label' => 'Amsterdam', 'offset' => 'UTC+1/+2'],
            
            // Asia
            ['value' => 'Asia/Kolkata', 'label' => 'India Standard Time', 'offset' => 'UTC+5:30'],
            ['value' => 'Asia/Shanghai', 'label' => 'China Standard Time', 'offset' => 'UTC+8'],
            ['value' => 'Asia/Tokyo', 'label' => 'Japan Standard Time', 'offset' => 'UTC+9'],
            ['value' => 'Asia/Seoul', 'label' => 'Korea Standard Time', 'offset' => 'UTC+9'],
            ['value' => 'Asia/Singapore', 'label' => 'Singapore', 'offset' => 'UTC+8'],
            ['value' => 'Asia/Dubai', 'label' => 'Dubai', 'offset' => 'UTC+4'],
            
            // Africa
            ['value' => 'Africa/Cairo', 'label' => 'Cairo', 'offset' => 'UTC+2'],
            ['value' => 'Africa/Johannesburg', 'label' => 'Johannesburg', 'offset' => 'UTC+2'],
            ['value' => 'Africa/Lagos', 'label' => 'Lagos', 'offset' => 'UTC+1'],
            ['value' => 'Africa/Blantyre', 'label' => 'Malawi', 'offset' => 'UTC+2'],
            ['value' => 'Africa/Nairobi', 'label' => 'Nairobi', 'offset' => 'UTC+3'],
            
            // Australia/Oceania
            ['value' => 'Australia/Sydney', 'label' => 'Sydney', 'offset' => 'UTC+10/+11'],
            ['value' => 'Australia/Melbourne', 'label' => 'Melbourne', 'offset' => 'UTC+10/+11'],
            ['value' => 'Australia/Perth', 'label' => 'Perth', 'offset' => 'UTC+8'],
            ['value' => 'Pacific/Auckland', 'label' => 'Auckland', 'offset' => 'UTC+12/+13'],
            
            // UTC
            ['value' => 'UTC', 'label' => 'UTC (Coordinated Universal Time)', 'offset' => 'UTC+0']
        ];

        return response()->json([
            'success' => true,
            'timezones' => $timezones
        ]);
    }

    /**
     * Get client IP address
     */
    private function getClientIP(Request $request): ?string
    {
        $ipKeys = [
            'HTTP_CF_CONNECTING_IP',     // Cloudflare
            'HTTP_CLIENT_IP',
            'HTTP_X_FORWARDED_FOR',
            'HTTP_X_FORWARDED',
            'HTTP_X_CLUSTER_CLIENT_IP',
            'HTTP_FORWARDED_FOR',
            'HTTP_FORWARDED',
            'REMOTE_ADDR'
        ];

        foreach ($ipKeys as $key) {
            if (array_key_exists($key, $_SERVER) === true) {
                foreach (explode(',', $_SERVER[$key]) as $ip) {
                    $ip = trim($ip);
                    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false) {
                        return $ip;
                    }
                }
            }
        }

        return $request->ip();
    }
}
