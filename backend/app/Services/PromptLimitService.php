<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class PromptLimitService
{
    const DAILY_PROMPT_LIMIT = 5;
    const CACHE_PREFIX = 'prompt_usage_';
    const CACHE_TTL = 86400; // 24 hours

    /**
     * Check if user can make another prompt today
     */
    public static function canMakePrompt(int $userId): bool
    {
        $usage = self::getTodayUsage($userId);
        return $usage['count'] < self::DAILY_PROMPT_LIMIT;
    }

    /**
     * Get remaining prompts for today
     */
    public static function getRemainingPrompts(int $userId): int
    {
        $usage = self::getTodayUsage($userId);
        return max(0, self::DAILY_PROMPT_LIMIT - $usage['count']);
    }

    /**
     * Get prompt limit status
     */
    public static function getPromptLimitStatus(int $userId): array
    {
        $usage = self::getTodayUsage($userId);
        $remaining = max(0, self::DAILY_PROMPT_LIMIT - $usage['count']);
        $isLimitReached = $usage['count'] >= self::DAILY_PROMPT_LIMIT;
        
        // Calculate reset time (next day at midnight)
        $tomorrow = now()->addDay()->startOfDay();
        
        return [
            'remaining' => $remaining,
            'total' => self::DAILY_PROMPT_LIMIT,
            'reset_time' => $tomorrow->toISOString(),
            'is_limit_reached' => $isLimitReached,
            'used_today' => $usage['count']
        ];
    }

    /**
     * Record a prompt usage
     */
    public static function recordPromptUsage(int $userId): array
    {
        $usage = self::getTodayUsage($userId);
        $usage['count'] += 1;
        $usage['last_used'] = now()->toISOString();
        
        $cacheKey = self::CACHE_PREFIX . $userId . '_' . now()->toDateString();
        Cache::put($cacheKey, $usage, self::CACHE_TTL);
        
        Log::info('Prompt usage recorded', [
            'user_id' => $userId,
            'count' => $usage['count'],
            'limit' => self::DAILY_PROMPT_LIMIT
        ]);
        
        return self::getPromptLimitStatus($userId);
    }

    /**
     * Get today's usage data
     */
    private static function getTodayUsage(int $userId): array
    {
        $cacheKey = self::CACHE_PREFIX . $userId . '_' . now()->toDateString();
        $usage = Cache::get($cacheKey);
        
        if (!$usage) {
            $usage = [
                'date' => now()->toDateString(),
                'count' => 0,
                'last_used' => null
            ];
            Cache::put($cacheKey, $usage, self::CACHE_TTL);
        }
        
        return $usage;
    }

    /**
     * Reset prompt usage (for testing or admin purposes)
     */
    public static function resetPromptUsage(int $userId): void
    {
        $cacheKey = self::CACHE_PREFIX . $userId . '_' . now()->toDateString();
        Cache::forget($cacheKey);
        
        Log::info('Prompt usage reset', ['user_id' => $userId]);
    }

    /**
     * Get usage statistics for admin
     */
    public static function getUsageStats(int $userId, int $days = 7): array
    {
        $stats = [];
        for ($i = 0; $i < $days; $i++) {
            $date = now()->subDays($i);
            $cacheKey = self::CACHE_PREFIX . $userId . '_' . $date->toDateString();
            $usage = Cache::get($cacheKey, ['count' => 0]);
            
            $stats[] = [
                'date' => $date->toDateString(),
                'count' => $usage['count'],
                'limit' => self::DAILY_PROMPT_LIMIT
            ];
        }
        
        return $stats;
    }
}



