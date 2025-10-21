<?php

namespace App\Http\Controllers;

use App\Models\DoctorWallet;
use App\Models\WalletTransaction;
use App\Models\WithdrawalRequest;
use App\Services\DoctorPaymentService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DoctorWalletController extends Controller
{
    /**
     * Get doctor's wallet information
     */
    public function getWallet(): JsonResponse
    {
        $user = Auth::user();

        if (!$user->isDoctor()) {
            return response()->json([
                'success' => false,
                'message' => 'Only doctors can access wallet'
            ], 403);
        }

        $wallet = DoctorWallet::getOrCreate($user->id);

        return response()->json([
            'success' => true,
            'data' => [
                'balance' => $wallet->balance,
                'total_earned' => $wallet->total_earned,
                'total_withdrawn' => $wallet->total_withdrawn,
                'payment_rates' => DoctorPaymentService::getPaymentAmountsForDoctor($user),
            ]
        ]);
    }

    /**
     * Get wallet transactions
     */
    public function getTransactions(Request $request): JsonResponse
    {
        $user = Auth::user();

        if (!$user->isDoctor()) {
            return response()->json([
                'success' => false,
                'message' => 'Only doctors can access wallet transactions'
            ], 403);
        }

        $perPage = $request->get('per_page', 15);
        $type = $request->get('type'); // 'credit', 'debit', or null for all

        $query = WalletTransaction::where('doctor_id', $user->id);

        if ($type) {
            $query->where('type', $type);
        }

        $transactions = $query->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $transactions
        ]);
    }

    /**
     * Get earnings summary
     */
    public function getEarningsSummary(): JsonResponse
    {
        $user = Auth::user();

        if (!$user->isDoctor()) {
            return response()->json([
                'success' => false,
                'message' => 'Only doctors can access earnings summary'
            ], 403);
        }

        $wallet = DoctorWallet::getOrCreate($user->id);

        // Get earnings by session type
        $earningsByType = $wallet->getEarningsByType();

        // Get recent transactions
        $recentTransactions = $wallet->getRecentTransactions(5);

        return response()->json([
            'success' => true,
            'data' => [
                'wallet' => [
                    'balance' => $wallet->balance,
                    'total_earned' => $wallet->total_earned,
                    'total_withdrawn' => $wallet->total_withdrawn,
                ],
                'earnings_by_type' => $earningsByType,
                'recent_transactions' => $recentTransactions,
                'payment_rates' => DoctorPaymentService::getPaymentAmountsForDoctor($user),
            ]
        ]);
    }

    /**
     * Request withdrawal (creates a withdrawal request for admin approval)
     */
    public function requestWithdrawal(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        $request->validate([
            'amount' => 'required|numeric|min:1000|max:1000000', // Min 1000, Max 1M
            'payment_method' => 'required|in:bank_transfer,mobile_money',
            'payment_details' => 'required|array',
        ]);

        // Validate payment details based on method
        if ($request->payment_method === 'bank_transfer') {
            $request->validate([
                'payment_details.bank_name' => 'required|string|max:255',
                'payment_details.account_number' => 'required|string|max:255',
                'payment_details.bank_branch' => 'nullable|string|max:255', // Required for Malawi users
            ]);
        } else {
            // Mobile money only allowed for Malawian users
            $userCountry = strtolower($user->country ?? '');
            Log::info('Mobile money withdrawal attempt', [
                'user_id' => $user->id,
                'user_country' => $user->country,
                'user_country_lowercase' => $userCountry,
                'is_malawi_user' => $userCountry === 'malawi'
            ]);
            
            if ($userCountry !== 'malawi') {
                return response()->json([
                    'success' => false,
                    'message' => 'Mobile money is only available for Malawian users'
                ], 400);
            }
            
            $request->validate([
                'payment_details.mobile_provider' => 'required|in:airtel,tnm',
                'payment_details.mobile_number' => 'required|string|max:20',
            ]);
        }

        if (!$user->isDoctor()) {
            return response()->json([
                'success' => false,
                'message' => 'Only doctors can request withdrawals'
            ], 403);
        }

        $wallet = DoctorWallet::getOrCreate($user->id);

        if ($wallet->balance < $request->amount) {
            return response()->json([
                'success' => false,
                'message' => 'Insufficient balance for withdrawal'
            ], 400);
        }

        // Validate that withdrawal amount doesn't exceed verified payment transactions
        $totalVerifiedPayments = WalletTransaction::where('doctor_id', $user->id)
            ->where('type', 'credit')
            ->whereNotNull('payment_transaction_id')
            ->sum('amount');

        $totalWithdrawn = WalletTransaction::where('doctor_id', $user->id)
            ->where('type', 'debit')
            ->sum('amount');

        $availableForWithdrawal = $totalVerifiedPayments - $totalWithdrawn;

        if ($request->amount > $availableForWithdrawal) {
            return response()->json([
                'success' => false,
                'message' => 'Withdrawal amount exceeds verified earnings. Only funds from verified patient payments can be withdrawn.',
                'data' => [
                    'total_verified_payments' => $totalVerifiedPayments,
                    'total_withdrawn' => $totalWithdrawn,
                    'available_for_withdrawal' => $availableForWithdrawal,
                    'requested_amount' => $request->amount
                ]
            ], 400);
        }

        try {
            DB::beginTransaction();

            // Create withdrawal request
            $withdrawalData = [
                'doctor_id' => $user->id,
                'amount' => $request->amount,
                'status' => WithdrawalRequest::STATUS_PENDING,
                'payment_method' => $request->payment_method,
            ];

            // Add payment details based on method
            if ($request->payment_method === 'bank_transfer') {
                $withdrawalData['bank_name'] = $request->payment_details['bank_name'];
                $withdrawalData['account_number'] = $request->payment_details['account_number'];
                $withdrawalData['bank_branch'] = $request->payment_details['bank_branch'] ?? null;
                $withdrawalData['account_holder_name'] = $user->first_name . ' ' . $user->last_name;
            } else {
                $withdrawalData['mobile_provider'] = $request->payment_details['mobile_provider'];
                $withdrawalData['mobile_number'] = $request->payment_details['mobile_number'];
            }

            $withdrawalRequest = WithdrawalRequest::create($withdrawalData);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Withdrawal request submitted successfully. It will be reviewed by the finance team within 1-2 business days.',
                'data' => [
                    'request_id' => $withdrawalRequest->id,
                    'amount' => $withdrawalRequest->amount,
                    'status' => $withdrawalRequest->status,
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to submit withdrawal request'
            ], 500);
        }
    }

    /**
     * Get withdrawal requests for doctor
     */
    public function getWithdrawalRequests(Request $request): JsonResponse
    {
        $user = Auth::user();

        if (!$user->isDoctor()) {
            return response()->json([
                'success' => false,
                'message' => 'Only doctors can access withdrawal requests'
            ], 403);
        }

        $perPage = $request->get('per_page', 15);
        $status = $request->get('status'); // 'pending', 'approved', 'rejected', 'paid'

        $query = WithdrawalRequest::where('doctor_id', $user->id)
            ->with(['approver', 'payer']);

        if ($status) {
            $query->where('status', $status);
        }

        $requests = $query->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $requests
        ]);
    }

    /**
     * Get payment rates
     */
    public function getPaymentRates(): JsonResponse
    {
        $user = Auth::user();

        if (!$user->isDoctor()) {
            return response()->json([
                'success' => false,
                'message' => 'Only doctors can access payment rates'
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => DoctorPaymentService::getPaymentAmountsForDoctor($user)
        ]);
    }
} 