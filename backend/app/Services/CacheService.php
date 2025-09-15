<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use App\Models\User;
use App\Models\Appointment;
use App\Models\Plan;
use App\Models\WorkingHours;

class CacheService
{
    /**
     * Cache duration in minutes
     */
    const CACHE_DURATION = 60;

    /**
     * Cache key prefixes
     */
    const USER_PREFIX = 'user_';
    const DOCTOR_PREFIX = 'doctor_';
    const APPOINTMENT_PREFIX = 'appointment_';
    const PLAN_PREFIX = 'plan_';
    const STATS_PREFIX = 'stats_';

    /**
     * Cache user data
     */
    public static function cacheUser($userId, $data = null)
    {
        $key = self::USER_PREFIX . $userId;
        
        if ($data === null) {
            $data = User::with(['subscription', 'reviews', 'workingHours'])->find($userId);
        }
        
        return Cache::remember($key, self::CACHE_DURATION, function () use ($data) {
            return $data;
        });
    }

    /**
     * Cache doctor data with appointments
     */
    public static function cacheDoctor($doctorId, $data = null)
    {
        $key = self::DOCTOR_PREFIX . $doctorId;
        
        if ($data === null) {
            $data = User::with(['workingHours', 'reviews'])
                ->where('id', $doctorId)
                ->where('user_type', 'doctor')
                ->first();
        }
        
        return Cache::remember($key, self::CACHE_DURATION, function () use ($data) {
            return $data;
        });
    }

    /**
     * Cache available doctors
     */
    public static function cacheAvailableDoctors()
    {
        $key = 'available_doctors';
        
        return Cache::remember($key, self::CACHE_DURATION, function () {
            return User::with('workingHours')
                ->where('user_type', 'doctor')
                ->where('is_active', true)
                ->get();
        });
    }

    /**
     * Cache appointment data
     */
    public static function cacheAppointment($appointmentId, $data = null)
    {
        $key = self::APPOINTMENT_PREFIX . $appointmentId;
        
        if ($data === null) {
            $data = Appointment::with(['patient', 'doctor'])->find($appointmentId);
        }
        
        return Cache::remember($key, self::CACHE_DURATION, function () use ($data) {
            return $data;
        });
    }

    /**
     * Cache user appointments
     */
    public static function cacheUserAppointments($userId, $userType)
    {
        $key = "user_appointments_{$userId}_{$userType}";
        
        return Cache::remember($key, self::CACHE_DURATION, function () use ($userId, $userType) {
            $user = User::find($userId);
            
            if ($userType === 'doctor') {
                return $user->doctorAppointments()->with('patient')->get();
            } else {
                return $user->patientAppointments()->with('doctor')->get();
            }
        });
    }

    /**
     * Cache plans
     */
    public static function cachePlans()
    {
        $key = 'plans';
        
        return Cache::remember($key, self::CACHE_DURATION, function () {
            return Plan::where('status', 1)->get();
        });
    }

    /**
     * Cache dashboard statistics
     */
    public static function cacheDashboardStats()
    {
        $key = self::STATS_PREFIX . 'dashboard';
        
        return Cache::remember($key, self::CACHE_DURATION, function () {
            return [
                'total_users' => User::count(),
                'total_doctors' => User::where('user_type', 'doctor')->count(),
                'total_patients' => User::where('user_type', 'patient')->count(),
                'total_appointments' => Appointment::count(),
                'pending_appointments' => Appointment::where('status', 0)->count(),
                'completed_appointments' => Appointment::where('status', 3)->count(),
            ];
        });
    }

    /**
     * Cache working hours for a doctor
     */
    public static function cacheDoctorWorkingHours($doctorId)
    {
        $key = "doctor_working_hours_{$doctorId}";
        
        return Cache::remember($key, self::CACHE_DURATION, function () use ($doctorId) {
            return WorkingHours::where('doctor_id', $doctorId)->get();
        });
    }

    /**
     * Clear user cache
     */
    public static function clearUserCache($userId)
    {
        Cache::forget(self::USER_PREFIX . $userId);
        Cache::forget("user_appointments_{$userId}_doctor");
        Cache::forget("user_appointments_{$userId}_patient");
    }

    /**
     * Clear doctor cache
     */
    public static function clearDoctorCache($doctorId)
    {
        Cache::forget(self::DOCTOR_PREFIX . $doctorId);
        Cache::forget("doctor_working_hours_{$doctorId}");
        Cache::forget('available_doctors');
    }

    /**
     * Clear appointment cache
     */
    public static function clearAppointmentCache($appointmentId)
    {
        Cache::forget(self::APPOINTMENT_PREFIX . $appointmentId);
    }

    /**
     * Clear all caches
     */
    public static function clearAllCaches()
    {
        Cache::flush();
    }

    /**
     * Clear related caches when appointment changes
     */
    public static function clearAppointmentRelatedCaches($appointment)
    {
        self::clearAppointmentCache($appointment->id);
        self::clearUserCache($appointment->patient_id);
        self::clearDoctorCache($appointment->doctor_id);
    }

    /**
     * Get cache statistics
     */
    public static function getCacheStats()
    {
        return [
            'cache_driver' => config('cache.default'),
            'cache_prefix' => config('cache.prefix'),
            'cache_ttl' => self::CACHE_DURATION,
        ];
    }
} 