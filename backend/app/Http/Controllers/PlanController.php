<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\LocationService;
use App\Models\User;

class PlanController extends Controller
{
    /**
     * Get plans based on user's location
     */
    public function getPlansForUser(Request $request)
    {
        try {
            $user = auth()->user();
            $country = $user ? $user->country : $request->get('country', 'Malawi');
            
            $plans = LocationService::getPlansForCountry($country);
            
            return response()->json([
                'success' => true,
                'plans' => $plans,
                'user_country' => $country,
                'currency' => LocationService::getCurrencyForCountry($country)
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch plans',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all plans with currency information
     */
    public function getAllPlans(Request $request)
    {
        try {
            $plans = LocationService::getAllPlansWithCurrency();
            
            return response()->json([
                'success' => true,
                'plans' => $plans
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch plans',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get pricing information for a specific country
     */
    public function getPricingForCountry(Request $request)
    {
        try {
            $country = $request->get('country', 'Malawi');
            $pricing = LocationService::getPricingForCountry($country);
            
            return response()->json([
                'success' => true,
                'pricing' => $pricing,
                'country' => $country,
                'currency' => LocationService::getCurrencyForCountry($country)
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch pricing',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get currency information for a country
     */
    public function getCurrencyInfo(Request $request)
    {
        try {
            $country = $request->get('country', 'Malawi');
            $currency = LocationService::getCurrencyForCountry($country);
            
            return response()->json([
                'success' => true,
                'country' => $country,
                'currency' => $currency,
                'symbol' => LocationService::getCurrencySymbol($currency),
                'is_malawi' => LocationService::isInMalawi($country)
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch currency information',
                'error' => $e->getMessage()
            ], 500);
        }
    }
} 