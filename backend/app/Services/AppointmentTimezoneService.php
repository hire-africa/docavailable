<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class AppointmentTimezoneService
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
        return TimezoneService::convertToUTC($dateStr, $timeStr, $userTimezone);
    }

    /**
     * Convert UTC appointment to user's timezone for display
     *
     * @param Carbon $utcDateTime
     * @param string $userTimezone
     * @return Carbon
     */
    public static function convertToUserTimezone($utcDateTime, $userTimezone = 'UTC')
    {
        return TimezoneService::convertFromUTC($utcDateTime, $userTimezone);
    }

    /**
     * Get display time for an appointment (handles both old and new formats)
     *
     * @param \App\Models\Appointment $appointment
     * @param string|null $requestedTimezone Override timezone for display
     * @return string
     */
    public static function getDisplayTime($appointment, $requestedTimezone = null)
    {
        try {
            $timezone = $requestedTimezone ?: $appointment->user_timezone ?: 'UTC';
            
            // Use UTC datetime if available (new format)
            if ($appointment->appointment_datetime_utc) {
                $utcDateTime = Carbon::parse($appointment->appointment_datetime_utc);
                $localDateTime = self::convertToUserTimezone($utcDateTime, $timezone);
                return $localDateTime->format('H:i');
            }
            
            // Fallback to old format for backward compatibility
            return $appointment->appointment_time;
            
        } catch (\Exception $e) {
            Log::error('Error getting display time for appointment', [
                'appointment_id' => $appointment->id,
                'timezone' => $timezone,
                'error' => $e->getMessage()
            ]);
            
            // Fallback to old format
            return $appointment->appointment_time;
        }
    }

    /**
     * Get display date for an appointment (handles both old and new formats)
     *
     * @param \App\Models\Appointment $appointment
     * @param string|null $requestedTimezone Override timezone for display
     * @return string
     */
    public static function getDisplayDate($appointment, $requestedTimezone = null)
    {
        try {
            $timezone = $requestedTimezone ?: $appointment->user_timezone ?: 'UTC';
            
            // Use UTC datetime if available (new format)
            if ($appointment->appointment_datetime_utc) {
                $utcDateTime = Carbon::parse($appointment->appointment_datetime_utc);
                $localDateTime = self::convertToUserTimezone($utcDateTime, $timezone);
                return $localDateTime->format('Y-m-d');
            }
            
            // Fallback to old format for backward compatibility
            return $appointment->appointment_date;
            
        } catch (\Exception $e) {
            Log::error('Error getting display date for appointment', [
                'appointment_id' => $appointment->id,
                'timezone' => $timezone,
                'error' => $e->getMessage()
            ]);
            
            // Fallback to old format
            return $appointment->appointment_date;
        }
    }

    /**
     * Get formatted datetime string for display
     *
     * @param \App\Models\Appointment $appointment
     * @param string|null $requestedTimezone Override timezone for display
     * @param string $format Date format string
     * @return string
     */
    public static function getFormattedDateTime($appointment, $requestedTimezone = null, $format = 'Y-m-d H:i')
    {
        try {
            $timezone = $requestedTimezone ?: $appointment->user_timezone ?: 'UTC';
            
            // Use UTC datetime if available (new format)
            if ($appointment->appointment_datetime_utc) {
                $utcDateTime = Carbon::parse($appointment->appointment_datetime_utc);
                $localDateTime = self::convertToUserTimezone($utcDateTime, $timezone);
                return $localDateTime->format($format);
            }
            
            // Fallback to old format for backward compatibility
            return $appointment->appointment_date . ' ' . $appointment->appointment_time;
            
        } catch (\Exception $e) {
            Log::error('Error getting formatted datetime for appointment', [
                'appointment_id' => $appointment->id,
                'timezone' => $timezone,
                'format' => $format,
                'error' => $e->getMessage()
            ]);
            
            // Fallback to old format
            return $appointment->appointment_date . ' ' . $appointment->appointment_time;
        }
    }

    /**
     * Check if appointment time has been reached (timezone-aware)
     *
     * @param \App\Models\Appointment $appointment
     * @param int $bufferMinutes
     * @return bool
     */
    public static function isAppointmentTimeReached($appointment, $bufferMinutes = 5)
    {
        try {
            // Use UTC datetime if available (new format)
            if ($appointment->appointment_datetime_utc) {
                $appointmentUTC = Carbon::parse($appointment->appointment_datetime_utc);
                $nowUTC = Carbon::now('UTC');
                $earliestStartTime = $nowUTC->copy()->subMinutes($bufferMinutes);
                
                return $appointmentUTC->lte($earliestStartTime);
            }
            
            // Fallback to old format using TimezoneService
            return TimezoneService::isAppointmentTimeReached(
                $appointment->appointment_date,
                $appointment->appointment_time,
                $appointment->user_timezone ?: 'UTC',
                $bufferMinutes
            );
            
        } catch (\Exception $e) {
            Log::error('Error checking appointment time reached', [
                'appointment_id' => $appointment->id,
                'buffer_minutes' => $bufferMinutes,
                'error' => $e->getMessage()
            ]);
            
            return false;
        }
    }

    /**
     * Migrate existing appointment to UTC format
     *
     * @param \App\Models\Appointment $appointment
     * @param string $userTimezone
     * @return bool
     */
    public static function migrateToUTC($appointment, $userTimezone = 'UTC')
    {
        try {
            if ($appointment->appointment_datetime_utc) {
                // Already migrated
                return true;
            }

            $utcDateTime = self::convertToUTC(
                $appointment->appointment_date,
                $appointment->appointment_time,
                $userTimezone
            );

            if ($utcDateTime) {
                $appointment->update([
                    'appointment_datetime_utc' => $utcDateTime,
                    'user_timezone' => $userTimezone
                ]);
                
                Log::info('Appointment migrated to UTC', [
                    'appointment_id' => $appointment->id,
                    'utc_datetime' => $utcDateTime->toISOString(),
                    'user_timezone' => $userTimezone
                ]);
                
                return true;
            }

            return false;
            
        } catch (\Exception $e) {
            Log::error('Error migrating appointment to UTC', [
                'appointment_id' => $appointment->id,
                'user_timezone' => $userTimezone,
                'error' => $e->getMessage()
            ]);
            
            return false;
        }
    }
}
