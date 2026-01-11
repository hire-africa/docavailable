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

            $utc = $appointmentDateTime->utc();

            Log::info('🕒 [TimezoneService] convertToUTC', [
                'input_date' => $dateStr,
                'input_time' => $timeStr,
                'input_timezone' => $userTimezone,
                'parsed_local' => $appointmentDateTime->toDateTimeString(),
                'result_utc' => $utc->toDateTimeString()
            ]);

            // Convert to UTC
            return $utc;
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
            // If the first argument is already a Carbon instance (our new field), use it directly
            if ($dateStr instanceof Carbon) {
                $appointmentUTC = $dateStr;
            } else if (is_object($dateStr) && property_exists($dateStr, 'appointment_datetime_utc') && $dateStr->appointment_datetime_utc) {
                // If an Appointment object was passed
                $appointmentUTC = $dateStr->appointment_datetime_utc;
            } else {
                // Fallback to legacy string parsing
                if (empty($dateStr) || empty($timeStr)) {
                    return false;
                }

                $appointmentDateTime = self::parseAppointmentDateTime($dateStr, $timeStr, $userTimezone);
                if (!$appointmentDateTime) {
                    return false;
                }
                $appointmentUTC = $appointmentDateTime->utc();
            }

            $nowUTC = Carbon::now('UTC');

            // CORRECT LOGIC: Allow starting up to X minutes BEFORE the scheduled time
            // If now is 21:57 and appointment is 22:00 (buffer 5), then (now + 5) is 22:02.
            // 22:00 <= 22:02 is TRUE.
            return $appointmentUTC->lte($nowUTC->copy()->addMinutes($bufferMinutes));

        } catch (\Exception $e) {
            Log::error('Error checking appointment time', ['error' => $e->getMessage()]);
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
                    $month = (int) $dateParts[0];
                    $day = (int) $dateParts[1];
                    $year = (int) $dateParts[2];

                    // Handle time format (remove AM/PM if present)
                    $timeStr = preg_replace('/\s*(AM|PM)/i', '', $timeStr);
                    $timeParts = explode(':', $timeStr);
                    $hour = (int) $timeParts[0];
                    $minute = (int) $timeParts[1];

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
