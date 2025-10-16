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
            // Validate input parameters
            if (empty($dateStr) || empty($timeStr)) {
                Log::warning('Empty appointment date or time provided', [
                    'date' => $dateStr,
                    'time' => $timeStr,
                    'timezone' => $userTimezone
                ]);
                return false;
            }

            // Validate timezone
            if (!self::isValidTimezone($userTimezone)) {
                Log::warning('Invalid timezone provided, defaulting to UTC', [
                    'provided_timezone' => $userTimezone,
                    'fallback_timezone' => 'UTC'
                ]);
                $userTimezone = 'UTC';
            }

            $appointmentDateTime = self::parseAppointmentDateTime($dateStr, $timeStr, $userTimezone);
            
            if (!$appointmentDateTime) {
                Log::error('Failed to parse appointment date/time', [
                    'date' => $dateStr,
                    'time' => $timeStr,
                    'timezone' => $userTimezone
                ]);
                return false;
            }

            // Convert to UTC for comparison
            $appointmentUTC = $appointmentDateTime->utc();
            $nowUTC = Carbon::now('UTC');
            
            // Allow appointments to start up to bufferMinutes before scheduled time
            $earliestStartTime = $nowUTC->copy()->subMinutes($bufferMinutes);
            
            $isReached = $appointmentUTC->lte($earliestStartTime);
            
            // Log the decision for debugging
            Log::info('Appointment time check result', [
                'date' => $dateStr,
                'time' => $timeStr,
                'timezone' => $userTimezone,
                'appointment_utc' => $appointmentUTC->toISOString(),
                'current_utc' => $nowUTC->toISOString(),
                'earliest_start_utc' => $earliestStartTime->toISOString(),
                'buffer_minutes' => $bufferMinutes,
                'is_reached' => $isReached
            ]);
            
            return $isReached;
        } catch (\Exception $e) {
            Log::error('Error checking appointment time', [
                'date' => $dateStr,
                'time' => $timeStr,
                'timezone' => $userTimezone,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
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

    /**
     * Validate if timezone is valid
     *
     * @param string $timezone
     * @return bool
     */
    private static function isValidTimezone($timezone)
    {
        try {
            $testDate = new \DateTime('now', new \DateTimeZone($timezone));
            return true;
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Validate appointment time input
     *
     * @param string $dateStr
     * @param string $timeStr
     * @return array
     */
    public static function validateAppointmentTime($dateStr, $timeStr)
    {
        $errors = [];

        if (empty($dateStr)) {
            $errors[] = 'Appointment date is required';
        }

        if (empty($timeStr)) {
            $errors[] = 'Appointment time is required';
        }

        if (!empty($dateStr) && !empty($timeStr)) {
            // Check if date is in the past
            $appointmentDateTime = self::parseAppointmentDateTime($dateStr, $timeStr);
            if ($appointmentDateTime && $appointmentDateTime->isPast()) {
                $errors[] = 'Appointment time cannot be in the past';
            }

            // Check if date is too far in the future (more than 1 year)
            $oneYearFromNow = Carbon::now()->addYear();
            if ($appointmentDateTime && $appointmentDateTime->isAfter($oneYearFromNow)) {
                $errors[] = 'Appointment time cannot be more than 1 year in the future';
            }
        }

        return [
            'is_valid' => empty($errors),
            'errors' => $errors
        ];
    }
}
