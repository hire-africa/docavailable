<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class TimezoneService
{
    /**
     * Convert appointment date/time to UTC for storage
     *
     * @param string $dateStr
     * @param string $timeStr
     * @param string $userTimezone
     * @return Carbon|null
     */
    public static function convertToUTC($dateStr, $timeStr, $userTimezone = 'UTC')
    {
        try {
            if (!$dateStr || !$timeStr) {
                return null;
            }

            // Parse the date/time in user's timezone
            $appointmentDateTime = self::parseAppointmentDateTime($dateStr, $timeStr, $userTimezone);
            
            if (!$appointmentDateTime) {
                return null;
            }

            // Convert to UTC
            return $appointmentDateTime->utc();
        } catch (\Exception $e) {
            Log::error('Error converting appointment to UTC', [
                'date' => $dateStr,
                'time' => $timeStr,
                'timezone' => $userTimezone,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Convert UTC appointment to user's timezone for display
     *
     * @param Carbon $utcDateTime
     * @param string $userTimezone
     * @return Carbon
     */
    public static function convertFromUTC($utcDateTime, $userTimezone = 'UTC')
    {
        try {
            return $utcDateTime->setTimezone($userTimezone);
        } catch (\Exception $e) {
            Log::error('Error converting from UTC', [
                'utc_datetime' => $utcDateTime->toISOString(),
                'timezone' => $userTimezone,
                'error' => $e->getMessage()
            ]);
            return $utcDateTime;
        }
    }

    /**
     * Check if appointment time has been reached considering user timezone
     *
     * @param string $dateStr
     * @param string $timeStr
     * @param string $userTimezone
     * @param int $bufferMinutes
     * @return bool
     */
    public static function isAppointmentTimeReached($dateStr, $timeStr, $userTimezone = 'UTC', $bufferMinutes = 5)
    {
        try {
            $appointmentDateTime = self::parseAppointmentDateTime($dateStr, $timeStr, $userTimezone);
            
            if (!$appointmentDateTime) {
                return false;
            }

            // Convert to UTC for comparison
            $appointmentUTC = $appointmentDateTime->utc();
            $nowUTC = Carbon::now('UTC');
            
            // Allow appointments to start up to bufferMinutes before scheduled time
            $earliestStartTime = $nowUTC->copy()->subMinutes($bufferMinutes);
            
            return $appointmentUTC->lte($earliestStartTime);
        } catch (\Exception $e) {
            Log::error('Error checking appointment time', [
                'date' => $dateStr,
                'time' => $timeStr,
                'timezone' => $userTimezone,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Parse appointment date and time in specified timezone
     *
     * @param string $dateStr
     * @param string $timeStr
     * @param string $timezone
     * @return Carbon|null
     */
    private static function parseAppointmentDateTime($dateStr, $timeStr, $timezone = 'UTC')
    {
        try {
            if (!$dateStr || !$timeStr) {
                return null;
            }

            // Handle different date formats
            if (strpos($dateStr, '/') !== false) {
                // Format: MM/DD/YYYY
                $dateParts = explode('/', $dateStr);
                if (count($dateParts) === 3) {
                    $month = (int)$dateParts[0];
                    $day = (int)$dateParts[1];
                    $year = (int)$dateParts[2];
                    
                    // Handle time format (remove AM/PM if present)
                    $timeStr = preg_replace('/\s*(AM|PM)/i', '', $timeStr);
                    $timeParts = explode(':', $timeStr);
                    $hour = (int)$timeParts[0];
                    $minute = (int)$timeParts[1];
                    
                    return Carbon::create($year, $month, $day, $hour, $minute, 0, $timezone);
                }
            } else {
                // Format: YYYY-MM-DD
                return Carbon::parse($dateStr . ' ' . $timeStr, $timezone);
            }
        } catch (\Exception $e) {
            Log::error('Error parsing appointment date/time', [
                'date' => $dateStr,
                'time' => $timeStr,
                'timezone' => $timezone,
                'error' => $e->getMessage()
            ]);
            return null;
        }
        
        return null;
    }

    /**
     * Get user's timezone from request or default
     *
     * @param \Illuminate\Http\Request $request
     * @return string
     */
    public static function getUserTimezone($request)
    {
        return $request->get('user_timezone') ?: config('app.timezone', 'UTC');
    }
}
