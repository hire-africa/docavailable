<?php

namespace App\Http\Controllers;

use App\Models\DoctorWallet;
use App\Models\DoctorPaymentMethod;
use App\Models\WalletTransaction;
use App\Models\WithdrawalRequest;
use App\Services\DoctorPaymentService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
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
                'payment_methods' => DoctorPaymentMethod::where('doctor_id', $user->id)
                    ->orderByDesc('is_primary')
                    ->orderByDesc('created_at')
                    ->get(),
            ]
        ]);
    }

    public function addPaymentMethod(Request $request): JsonResponse
    {
        $user = Auth::user();

        if (!$user->isDoctor()) {
            return response()->json([
                'success' => false,
                'message' => 'Only doctors can add payment methods'
            ], 403);
        }

        $request->validate([
            'current_password' => 'required|string',
            'type' => 'required|in:bank_transfer,mobile_money',
            'provider' => 'nullable|in:airtel_money,mpamba',
            'label' => 'required|string|max:255',
            'holder_name' => 'nullable|string|max:255',
            'details' => 'required|array',
        ]);

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Incorrect password'
            ], 422);
        }

        if ($request->type === 'mobile_money') {
            if (strtolower($user->country ?? '') !== 'malawi') {
                return response()->json([
                    'success' => false,
                    'message' => 'Mobile money is only available for Malawian doctors'
                ], 400);
            }

            $request->validate([
                'provider' => 'required|in:airtel_money,mpamba',
                'details.mobile_number' => 'required|string|max:20',
                'details.account_name' => 'required|string|max:255',
            ]);
        } else {
            $request->validate([
                'details.bank_name' => 'required|string|max:255',
                'details.account_number' => 'required|string|max:255',
                'details.account_name' => 'nullable|string|max:255',
                'details.bank_branch' => 'nullable|string|max:255',
            ]);
        }

        $hasPrimary = DoctorPaymentMethod::where('doctor_id', $user->id)->where('is_primary', true)->exists();

        $method = DoctorPaymentMethod::create([
            'doctor_id' => $user->id,
            'type' => $request->type,
            'provider' => $request->provider,
            'label' => $request->label,
            'holder_name' => $request->holder_name,
            'details' => $request->details,
            'is_primary' => !$hasPrimary,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Payment method added successfully',
            'data' => $method,
        ]);
    }

    public function deletePaymentMethod(Request $request, int $id): JsonResponse
    {
        $user = Auth::user();

        if (!$user->isDoctor()) {
            return response()->json([
                'success' => false,
                'message' => 'Only doctors can remove payment methods'
            ], 403);
        }

        $request->validate([
            'current_password' => 'required|string',
        ]);

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Incorrect password'
            ], 422);
        }

        $method = DoctorPaymentMethod::where('doctor_id', $user->id)->where('id', $id)->first();
        if (!$method) {
            return response()->json([
                'success' => false,
                'message' => 'Payment method not found'
            ], 404);
        }

        $wasPrimary = (bool) $method->is_primary;
        $method->delete();

        if ($wasPrimary) {
            $next = DoctorPaymentMethod::where('doctor_id', $user->id)->orderByDesc('created_at')->first();
            if ($next) {
                $next->update(['is_primary' => true]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Payment method removed successfully'
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

        // 📝 Audit Log: Capture raw request
        Log::info('💰 [DoctorWalletController] Withdrawal attempt started', [
            'user_id' => $user->id,
            'ip' => $request->ip(),
            'payload' => $request->all(),
            'user_agent' => $request->userAgent()
        ]);

        // 🛠 Backwards Compatibility: Alias 'method' to 'payment_method'
        if ($request->has('method') && !$request->has('payment_method')) {
            $request->merge(['payment_method' => $request->input('method')]);
        }

        // 🛠 Backwards Compatibility: Reconstruct payment_details if missing (old APKs)
        if (!$request->has('payment_details')) {
            $details = [];
            $method = $request->input('payment_method');

            if ($method === 'bank_transfer') {
                $details = [
                    'bank_name' => $request->input('bank_name'),
                    'account_number' => $request->input('account_number'),
                    'bank_branch' => $request->input('bank_branch') ?? $request->input('branch_name'),
                ];
            } elseif ($method === 'mobile_money') {
                $details = [
                    'mobile_provider' => $request->input('mobile_provider'),
                    'mobile_number' => $request->input('mobile_number'),
                ];
            }

            if (!empty($details)) {
                $request->merge(['payment_details' => $details]);
                Log::info('🛠 [DoctorWalletController] Reconstructed payment_details for old APK', [
                    'user_id' => $user->id,
                    'reconstructed_details' => $details
                ]);
            }
        }

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

            if ($userCountry !== 'malawi') {
                Log::warning('⚠️ [DoctorWalletController] Mobile money rejected - country mismatch', [
                    'user_id' => $user->id,
                    'country' => $userCountry
                ]);
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
            Log::warning('⚠️ [DoctorWalletController] Insufficient balance', [
                'user_id' => $user->id,
                'balance' => $wallet->balance,
                'requested' => $request->amount
            ]);
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
            Log::warning('⚠️ [DoctorWalletController] Exceeds verified earnings', [
                'user_id' => $user->id,
                'verified' => $totalVerifiedPayments,
                'withdrawn' => $totalWithdrawn,
                'available' => $availableForWithdrawal,
                'requested' => $request->amount
            ]);
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

            // 🔒 Lock the wallet for update to prevent parallel request race conditions
            $wallet = DoctorWallet::where('doctor_id', $user->id)->lockForUpdate()->first();

            if ($wallet->balance < $request->amount) {
                return response()->json([
                    'success' => false,
                    'message' => 'Insufficient balance for withdrawal (locked check)'
                ], 400);
            }

            // 💸 Immediate Debit: Lock the funds now
            $transaction = $wallet->debit(
                $request->amount,
                "Withdrawal Request (Pending Admin Approval)",
                [
                    'payment_method' => $request->payment_method,
                    'is_pending' => true
                ]
            );

            // Create withdrawal request
            $withdrawalData = [
                'doctor_id' => $user->id,
                'amount' => $request->amount,
                'status' => WithdrawalRequest::STATUS_PENDING,
                'payment_method' => $request->payment_method,
                'bank_name' => $request->input('payment_details.bank_name'),
                'account_number' => $request->input('payment_details.account_number'),
                'bank_branch' => $request->input('payment_details.bank_branch'),
                'account_holder_name' => $user->first_name . ' ' . $user->last_name,
                'mobile_provider' => $request->input('payment_details.mobile_provider'),
                'mobile_number' => $request->input('payment_details.mobile_number'),
            ];

            $withdrawalRequest = WithdrawalRequest::create($withdrawalData);

            // 🔗 Link transaction to request
            $transaction->update([
                'metadata' => array_merge($transaction->metadata ?? [], [
                    'withdrawal_request_id' => $withdrawalRequest->id
                ])
            ]);

            Log::info('✅ [DoctorWalletController] Withdrawal request verified and saved', [
                'user_id' => $user->id,
                'withdrawal_request_id' => $withdrawalRequest->id
            ]);

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
            Log::error('❌ [DoctorWalletController] Failed to save withdrawal', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
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