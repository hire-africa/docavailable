<?php

namespace App\Services;

use App\Models\Plan;

class LocationService
{
    /**
     * Check if user is in Malawi
     */
    public static function isInMalawi(string $country): bool
    {
        return $country === 'Malawi';
    }

    /**
     * Get currency for a specific country
     */
    public static function getCurrencyForCountry(string $country): string
    {
        return self::isInMalawi($country) ? 'MWK' : 'USD';
    }

    /**
     * Get plans based on user's country
     */
    public static function getPlansForCountry(string $country): array
    {
        $currency = self::getCurrencyForCountry($country);
        $cacheKey = "plans_for_country_{$country}_{$currency}";
        
        return \Illuminate\Support\Facades\Cache::remember($cacheKey, 300, function () use ($currency, $country) {
            try {
                $plans = Plan::where('currency', $currency)
                            ->where('status', true)
                            ->orderBy('price')
                            ->get()
                            ->toArray();
                
                // If no plans found, return default plans
                if (empty($plans)) {
                    return self::getDefaultPlans($country);
                }
                
                return $plans;
            } catch (\Exception $e) {
                // If database error, return default plans
                \Illuminate\Support\Facades\Log::warning('Error fetching plans from database: ' . $e->getMessage());
                return self::getDefaultPlans($country);
            }
        });
    }

    /**
     * Get all plans with currency information
     */
    public static function getAllPlansWithCurrency(): array
    {
        return \Illuminate\Support\Facades\Cache::remember('all_plans_with_currency', 300, function () {
            try {
                $plans = Plan::where('status', true)
                           ->orderBy('currency')
                           ->orderBy('price')
                           ->get()
                           ->toArray();
                
                // If no plans found, return default plans for all currencies
                if (empty($plans)) {
                    return array_merge(
                        self::getDefaultPlans('Malawi'),
                        self::getDefaultPlans('Zambia')
                    );
                }
                
                return $plans;
            } catch (\Exception $e) {
                // If database error, return default plans
                \Illuminate\Support\Facades\Log::warning('Error fetching all plans from database: ' . $e->getMessage());
                return array_merge(
                    self::getDefaultPlans('Malawi'),
                    self::getDefaultPlans('Zambia')
                );
            }
        });
    }

    /**
     * Get default plans for a country when database is unavailable
     */
    private static function getDefaultPlans(string $country): array
    {
        $currency = self::getCurrencyForCountry($country);
        
        if ($currency === 'MWK') {
            return [
                [
                    'id' => 1,
                    'name' => 'Basic Plan',
                    'features' => ['5 text sessions', 'Basic support'],
                    'currency' => 'MWK',
                    'price' => 2500,
                    'duration' => 30,
                    'status' => 1,
                    'text_sessions' => 5,
                    'voice_calls' => 0,
                    'video_calls' => 0,
                    'created_at' => now()->toISOString(),
                    'updated_at' => now()->toISOString()
                ],
                [
                    'id' => 2,
                    'name' => 'Standard Plan',
                    'features' => ['15 text sessions', '5 voice calls', 'Priority support'],
                    'currency' => 'MWK',
                    'price' => 7500,
                    'duration' => 30,
                    'status' => 1,
                    'text_sessions' => 15,
                    'voice_calls' => 5,
                    'video_calls' => 0,
                    'created_at' => now()->toISOString(),
                    'updated_at' => now()->toISOString()
                ],
                [
                    'id' => 3,
                    'name' => 'Premium Plan',
                    'features' => ['Unlimited text sessions', '15 voice calls', '5 video calls', '24/7 support'],
                    'currency' => 'MWK',
                    'price' => 15000,
                    'duration' => 30,
                    'status' => 1,
                    'text_sessions' => -1, // -1 means unlimited
                    'voice_calls' => 15,
                    'video_calls' => 5,
                    'created_at' => now()->toISOString(),
                    'updated_at' => now()->toISOString()
                ]
            ];
        } else {
            return [
                [
                    'id' => 4,
                    'name' => 'Basic Plan',
                    'features' => ['5 text sessions', 'Basic support'],
                    'currency' => 'USD',
                    'price' => 5,
                    'duration' => 30,
                    'status' => 1,
                    'text_sessions' => 5,
                    'voice_calls' => 0,
                    'video_calls' => 0,
                    'created_at' => now()->toISOString(),
                    'updated_at' => now()->toISOString()
                ],
                [
                    'id' => 5,
                    'name' => 'Standard Plan',
                    'features' => ['15 text sessions', '5 voice calls', 'Priority support'],
                    'currency' => 'USD',
                    'price' => 15,
                    'duration' => 30,
                    'status' => 1,
                    'text_sessions' => 15,
                    'voice_calls' => 5,
                    'video_calls' => 0,
                    'created_at' => now()->toISOString(),
                    'updated_at' => now()->toISOString()
                ],
                [
                    'id' => 6,
                    'name' => 'Premium Plan',
                    'features' => ['Unlimited text sessions', '15 voice calls', '5 video calls', '24/7 support'],
                    'currency' => 'USD',
                    'price' => 30,
                    'duration' => 30,
                    'status' => 1,
                    'text_sessions' => -1, // -1 means unlimited
                    'voice_calls' => 15,
                    'video_calls' => 5,
                    'created_at' => now()->toISOString(),
                    'updated_at' => now()->toISOString()
                ]
            ];
        }
    }

    /**
     * Format currency amount
     */
    public static function formatCurrency(float $amount, string $currency): string
    {
        if ($currency === 'MWK') {
            return 'mk ' . number_format($amount);
        } elseif ($currency === 'USD') {
            return '$' . number_format($amount);
        }
        
        return $currency . ' ' . number_format($amount);
    }

    /**
     * Get currency symbol
     */
    public static function getCurrencySymbol(string $currency): string
    {
        switch ($currency) {
            case 'MWK':
                return 'mk';
            case 'USD':
                return '$';
            default:
                return $currency;
        }
    }

    /**
     * Get pricing information for a specific country
     */
    public static function getPricingForCountry(string $country): array
    {
        $currency = self::getCurrencyForCountry($country);
        $plans = self::getPlansForCountry($country);
        
        $pricing = [];
        foreach ($plans as $plan) {
            $planName = strtolower(str_replace(' ', '', $plan['name']));
            $pricing[$planName] = [
                'price' => $plan['price'],
                'currency' => $plan['currency']
            ];
        }
        
        return $pricing;
    }

    /**
     * Clear all plan-related cache
     */
    public static function clearPlanCache(): void
    {
        \Illuminate\Support\Facades\Cache::forget('all_plans_with_currency');
        
        // Clear country-specific caches
        $countries = ['Malawi', 'Zambia', 'Zimbabwe', 'Tanzania', 'Kenya', 'Uganda'];
        foreach ($countries as $country) {
            $currency = self::getCurrencyForCountry($country);
            $cacheKey = "plans_for_country_{$country}_{$currency}";
            \Illuminate\Support\Facades\Cache::forget($cacheKey);
        }
    }
} 