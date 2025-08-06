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
        
        return \Illuminate\Support\Facades\Cache::remember($cacheKey, 300, function () use ($currency) {
            return Plan::where('currency', $currency)
                      ->where('status', true)
                      ->orderBy('price')
                      ->get()
                      ->toArray();
        });
    }

    /**
     * Get all plans with currency information
     */
    public static function getAllPlansWithCurrency(): array
    {
        return \Illuminate\Support\Facades\Cache::remember('all_plans_with_currency', 300, function () {
            return Plan::where('status', true)
                      ->orderBy('currency')
                      ->orderBy('price')
                      ->get()
                      ->toArray();
        });
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