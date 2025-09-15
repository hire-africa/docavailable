<?php

namespace App\Services;

use App\Models\WithdrawalRequest;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class WithdrawalRequestService
{
    /**
     * Create a new withdrawal request
     */
    public function createRequest(array $data): WithdrawalRequest
    {
        $request = WithdrawalRequest::create($data);

        // Log the request
        Log::info('Withdrawal request created', [
            'request_id' => $request->id,
            'doctor_id' => $request->doctor_id,
            'amount' => $request->amount,
            'status' => $request->status,
        ]);

        // TODO: Send notification to admin about new withdrawal request
        // $this->notifyAdminsOfNewRequest($request);

        return $request;
    }

    /**
     * Approve a withdrawal request
     */
    public function approveRequest(WithdrawalRequest $request, User $approver): bool
    {
        if (!$request->canBeApproved()) {
            return false;
        }

        $request->update([
            'status' => WithdrawalRequest::STATUS_APPROVED,
            'approved_by' => $approver->id,
            'approved_at' => now(),
        ]);

        // Log the approval
        Log::info('Withdrawal request approved', [
            'request_id' => $request->id,
            'doctor_id' => $request->doctor_id,
            'approved_by' => $approver->id,
            'amount' => $request->amount,
        ]);

        // TODO: Send notification to doctor about approval
        // $this->notifyDoctorOfApproval($request);

        return true;
    }

    /**
     * Reject a withdrawal request
     */
    public function rejectRequest(WithdrawalRequest $request, User $rejector, string $reason): bool
    {
        if (!$request->canBeRejected()) {
            return false;
        }

        $request->update([
            'status' => WithdrawalRequest::STATUS_REJECTED,
            'rejection_reason' => $reason,
        ]);

        // Log the rejection
        Log::info('Withdrawal request rejected', [
            'request_id' => $request->id,
            'doctor_id' => $request->doctor_id,
            'rejected_by' => $rejector->id,
            'reason' => $reason,
            'amount' => $request->amount,
        ]);

        // TODO: Send notification to doctor about rejection
        // $this->notifyDoctorOfRejection($request, $reason);

        return true;
    }

    /**
     * Mark a withdrawal request as paid
     */
    public function markAsPaid(WithdrawalRequest $request, User $payer, array $paymentDetails = []): bool
    {
        if (!$request->canBeMarkedAsPaid()) {
            return false;
        }

        $request->update([
            'status' => WithdrawalRequest::STATUS_PAID,
            'paid_by' => $payer->id,
            'paid_at' => now(),
            'payment_details' => $paymentDetails,
        ]);

        // Log the payment
        Log::info('Withdrawal request marked as paid', [
            'request_id' => $request->id,
            'doctor_id' => $request->doctor_id,
            'paid_by' => $payer->id,
            'amount' => $request->amount,
            'payment_details' => $paymentDetails,
        ]);

        // TODO: Send notification to doctor about payment
        // $this->notifyDoctorOfPayment($request);

        return true;
    }

    /**
     * Get withdrawal request statistics
     */
    public function getStatistics(): array
    {
        return [
            'total_requests' => WithdrawalRequest::count(),
            'pending_requests' => WithdrawalRequest::pending()->count(),
            'approved_requests' => WithdrawalRequest::approved()->count(),
            'rejected_requests' => WithdrawalRequest::rejected()->count(),
            'paid_requests' => WithdrawalRequest::paid()->count(),
            'total_amount_requested' => WithdrawalRequest::sum('amount'),
            'total_amount_paid' => WithdrawalRequest::paid()->sum('amount'),
            'total_amount_pending' => WithdrawalRequest::pending()->sum('amount'),
            'average_request_amount' => WithdrawalRequest::avg('amount'),
            'total_doctors_with_requests' => WithdrawalRequest::distinct('doctor_id')->count(),
        ];
    }

    /**
     * Get pending withdrawal requests for admin dashboard
     */
    public function getPendingRequests(int $limit = 10): \Illuminate\Database\Eloquent\Collection
    {
        return WithdrawalRequest::pending()
            ->with(['doctor'])
            ->orderBy('created_at', 'asc')
            ->limit($limit)
            ->get();
    }

    /**
     * Get recent withdrawal requests for a doctor
     */
    public function getDoctorRequests(int $doctorId, int $limit = 10): \Illuminate\Database\Eloquent\Collection
    {
        return WithdrawalRequest::where('doctor_id', $doctorId)
            ->with(['approver', 'payer'])
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Validate withdrawal request amount against doctor's balance
     */
    public function validateRequestAmount(int $doctorId, float $amount): array
    {
        $wallet = \App\Models\DoctorWallet::getOrCreate($doctorId);
        
        $validation = [
            'valid' => true,
            'errors' => [],
            'available_balance' => $wallet->balance,
            'requested_amount' => $amount,
        ];

        if ($amount <= 0) {
            $validation['valid'] = false;
            $validation['errors'][] = 'Amount must be greater than 0';
        }

        if ($amount > $wallet->balance) {
            $validation['valid'] = false;
            $validation['errors'][] = 'Insufficient balance for withdrawal';
        }

        if ($amount < 1000) {
            $validation['valid'] = false;
            $validation['errors'][] = 'Minimum withdrawal amount is MWK 1,000';
        }

        if ($amount > 1000000) {
            $validation['valid'] = false;
            $validation['errors'][] = 'Maximum withdrawal amount is MWK 1,000,000';
        }

        return $validation;
    }
}