<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\WithdrawalRequest;
use App\Models\DoctorWallet;
use App\Models\WalletTransaction;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class WithdrawalRequestController extends Controller
{
    /**
     * Get all withdrawal requests (admin only)
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = $request->get('per_page', 20);
        $status = $request->get('status');
        $doctorId = $request->get('doctor_id');
        $dateFrom = $request->get('date_from');
        $dateTo = $request->get('date_to');

        $query = WithdrawalRequest::with(['doctor', 'approver', 'payer']);

        // Apply filters
        if ($status) {
            $query->where('status', $status);
        }

        if ($doctorId) {
            $query->where('doctor_id', $doctorId);
        }

        if ($dateFrom) {
            $query->whereDate('created_at', '>=', $dateFrom);
        }

        if ($dateTo) {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        $requests = $query->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $requests
        ]);
    }

    /**
     * Get specific withdrawal request details
     */
    public function show($id): JsonResponse
    {
        $request = WithdrawalRequest::with(['doctor', 'approver', 'payer'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $request
        ]);
    }

    /**
     * Approve withdrawal request
     */
    public function approve($id): JsonResponse
    {
        $user = Auth::user();
        $withdrawalRequest = WithdrawalRequest::findOrFail($id);

        if (!$withdrawalRequest->canBeApproved()) {
            return response()->json([
                'success' => false,
                'message' => 'This withdrawal request cannot be approved'
            ], 400);
        }

        try {
            DB::beginTransaction();

            $withdrawalRequest->update([
                'status' => WithdrawalRequest::STATUS_APPROVED,
                'approved_by' => $user->id,
                'approved_at' => now(),
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Withdrawal request approved successfully',
                'data' => $withdrawalRequest->fresh(['doctor', 'approver', 'payer'])
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to approve withdrawal request'
            ], 500);
        }
    }

    /**
     * Reject withdrawal request
     */
    public function reject(Request $request, $id): JsonResponse
    {
        $request->validate([
            'rejection_reason' => 'required|string|max:500'
        ]);

        $user = Auth::user();
        $withdrawalRequest = WithdrawalRequest::findOrFail($id);

        if (!$withdrawalRequest->canBeRejected()) {
            return response()->json([
                'success' => false,
                'message' => 'This withdrawal request cannot be rejected'
            ], 400);
        }

        try {
            DB::beginTransaction();

            $withdrawalRequest->update([
                'status' => WithdrawalRequest::STATUS_REJECTED,
                'rejection_reason' => $request->rejection_reason,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Withdrawal request rejected successfully',
                'data' => $withdrawalRequest->fresh(['doctor', 'approver', 'payer'])
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to reject withdrawal request'
            ], 500);
        }
    }

    /**
     * Mark withdrawal request as paid
     */
    public function markAsPaid(Request $request, $id): JsonResponse
    {
        $request->validate([
            'payment_details' => 'nullable|array',
            'payment_details.payment_method' => 'nullable|string',
            'payment_details.transaction_id' => 'nullable|string',
            'payment_details.notes' => 'nullable|string',
        ]);

        $user = Auth::user();
        $withdrawalRequest = WithdrawalRequest::findOrFail($id);

        if (!$withdrawalRequest->canBeMarkedAsPaid()) {
            return response()->json([
                'success' => false,
                'message' => 'This withdrawal request cannot be marked as paid'
            ], 400);
        }

        try {
            DB::beginTransaction();

            // Get doctor's wallet
            $wallet = DoctorWallet::getOrCreate($withdrawalRequest->doctor_id);

            // Check if doctor has sufficient balance
            if ($wallet->balance < $withdrawalRequest->amount) {
                return response()->json([
                    'success' => false,
                    'message' => 'Insufficient balance in doctor\'s wallet'
                ], 400);
            }

            // Create withdrawal transaction
            $transaction = $wallet->debit(
                $withdrawalRequest->amount,
                "Withdrawal payment to {$withdrawalRequest->bank_name} - {$withdrawalRequest->account_holder_name}",
                [
                    'withdrawal_request_id' => $withdrawalRequest->id,
                    'bank_account' => $withdrawalRequest->bank_account,
                    'bank_name' => $withdrawalRequest->bank_name,
                    'account_holder_name' => $withdrawalRequest->account_holder_name,
                ]
            );

            // Update withdrawal request
            $withdrawalRequest->update([
                'status' => WithdrawalRequest::STATUS_PAID,
                'paid_by' => $user->id,
                'paid_at' => now(),
                'payment_details' => $request->payment_details,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Withdrawal request marked as paid successfully',
                'data' => [
                    'withdrawal_request' => $withdrawalRequest->fresh(['doctor', 'approver', 'payer']),
                    'transaction' => $transaction,
                    'new_balance' => $wallet->fresh()->balance,
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to mark withdrawal request as paid'
            ], 500);
        }
    }

    /**
     * Get withdrawal request statistics
     */
    public function getStats(): JsonResponse
    {
        $stats = [
            'total_requests' => WithdrawalRequest::count(),
            'pending_requests' => WithdrawalRequest::pending()->count(),
            'approved_requests' => WithdrawalRequest::approved()->count(),
            'rejected_requests' => WithdrawalRequest::rejected()->count(),
            'paid_requests' => WithdrawalRequest::paid()->count(),
            'total_amount_requested' => WithdrawalRequest::sum('amount'),
            'total_amount_paid' => WithdrawalRequest::paid()->sum('amount'),
            'total_amount_pending' => WithdrawalRequest::pending()->sum('amount'),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats
        ]);
    }
}