<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use App\Models\Subscription;
use App\Models\User;
use App\Models\PaymentTransaction;

class PaymentController extends Controller
{
    /**
     * Handle Paychangu webhook
     */
    public function webhook(Request $request)
    {
        try {
            Log::info('Paychangu webhook received', $request->all());

            // Verify webhook signature
            if (!$this->verifyWebhookSignature($request)) {
                Log::error('Paychangu webhook signature verification failed');
                return response()->json(['error' => 'Invalid signature'], 400);
            }

            $data = $request->all();
            
            // Extract payment information
            $transactionId = $data['transaction_id'] ?? null;
            $reference = $data['reference'] ?? null;
            $amount = $data['amount'] ?? 0;
            $currency = $data['currency'] ?? 'MWK';
            $status = $data['status'] ?? 'pending';
            $phoneNumber = $data['phone_number'] ?? null;
            $paymentMethod = $data['payment_method'] ?? 'mobile_money';

            if (!$transactionId || !$reference) {
                Log::error('Paychangu webhook missing required fields', $data);
                return response()->json(['error' => 'Missing required fields'], 400);
            }

            // Find or create payment transaction record
            $paymentTransaction = PaymentTransaction::updateOrCreate(
                ['transaction_id' => $transactionId],
                [
                    'reference' => $reference,
                    'amount' => $amount,
                    'currency' => $currency,
                    'status' => $status,
                    'phone_number' => $phoneNumber,
                    'payment_method' => $paymentMethod,
                    'gateway' => 'paychangu',
                    'webhook_data' => json_encode($data)
                ]
            );

            // Process based on status
            if ($status === 'success') {
                $this->processSuccessfulPayment($paymentTransaction);
            } elseif ($status === 'failed') {
                $this->processFailedPayment($paymentTransaction);
            }

            Log::info('Paychangu webhook processed successfully', [
                'transaction_id' => $transactionId,
                'status' => $status
            ]);

            return response()->json(['success' => true]);

        } catch (\Exception $e) {
            Log::error('Paychangu webhook processing failed', [
                'error' => $e->getMessage(),
                'data' => $request->all()
            ]);

            return response()->json(['error' => 'Webhook processing failed'], 500);
        }
    }

    /**
     * Verify webhook signature
     */
    private function verifyWebhookSignature(Request $request): bool
    {
        $webhookSecret = config('services.paychangu.webhook_secret');
        
        if (!$webhookSecret) {
            Log::warning('Paychangu webhook secret not configured');
            return false;
        }

        $payload = $request->getContent();
        $signature = $request->header('X-Paychangu-Signature');

        if (!$signature) {
            Log::error('Paychangu webhook signature header missing');
            return false;
        }

        $expectedSignature = hash_hmac('sha256', $payload, $webhookSecret);
        
        return hash_equals($expectedSignature, $signature);
    }

    /**
     * Process successful payment
     */
    private function processSuccessfulPayment(PaymentTransaction $transaction)
    {
        try {
            DB::beginTransaction();

            // Extract user ID from reference (assuming format: TXN_timestamp_userId_xxx)
            $referenceParts = explode('_', $transaction->reference);
            $userId = $referenceParts[2] ?? null;

            if (!$userId) {
                Log::error('Could not extract user ID from reference', [
                    'reference' => $transaction->reference
                ]);
                throw new \Exception('Invalid reference format');
            }

            $user = User::find($userId);
            if (!$user) {
                Log::error('User not found for payment', ['user_id' => $userId]);
                throw new \Exception('User not found');
            }

            // Update subscription based on payment amount
            $this->updateUserSubscription($user, $transaction);

            // Update transaction status
            $transaction->update([
                'status' => 'completed',
                'processed_at' => now()
            ]);

            DB::commit();

            Log::info('Payment processed successfully', [
                'user_id' => $user->id,
                'transaction_id' => $transaction->transaction_id,
                'amount' => $transaction->amount
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to process successful payment', [
                'error' => $e->getMessage(),
                'transaction_id' => $transaction->transaction_id
            ]);
            throw $e;
        }
    }

    /**
     * Process failed payment
     */
    private function processFailedPayment(PaymentTransaction $transaction)
    {
        $transaction->update([
            'status' => 'failed',
            'processed_at' => now()
        ]);

        Log::info('Payment marked as failed', [
            'transaction_id' => $transaction->transaction_id
        ]);
    }

    /**
     * Update user subscription based on payment
     */
    private function updateUserSubscription(User $user, PaymentTransaction $transaction)
    {
        // Define subscription plans based on payment amounts
        $plans = [
            5000 => ['text_sessions' => 5, 'voice_calls' => 2, 'video_calls' => 1],
            10000 => ['text_sessions' => 12, 'voice_calls' => 5, 'video_calls' => 3],
            15000 => ['text_sessions' => 20, 'voice_calls' => 10, 'video_calls' => 5],
        ];

        $amount = $transaction->amount;
        $plan = $plans[$amount] ?? null;

        if (!$plan) {
            Log::error('Unknown payment amount for subscription', [
                'amount' => $amount,
                'user_id' => $user->id
            ]);
            throw new \Exception('Unknown payment amount');
        }

        // Update or create subscription
        $subscription = Subscription::updateOrCreate(
            ['user_id' => $user->id],
            [
                'text_sessions_remaining' => $plan['text_sessions'],
                'voice_calls_remaining' => $plan['voice_calls'],
                'video_calls_remaining' => $plan['video_calls'],
                'payment_transaction_id' => $transaction->transaction_id,
                'payment_gateway' => 'paychangu',
                'expires_at' => now()->addMonth(),
                'status' => 'active'
            ]
        );

        Log::info('User subscription updated', [
            'user_id' => $user->id,
            'subscription_id' => $subscription->id,
            'plan' => $plan
        ]);
    }

    /**
     * Check payment status
     */
    public function checkStatus(Request $request)
    {
        $transactionId = $request->input('transaction_id');
        
        if (!$transactionId) {
            return response()->json(['error' => 'Transaction ID required'], 400);
        }

        $transaction = PaymentTransaction::where('transaction_id', $transactionId)->first();

        if (!$transaction) {
            return response()->json(['error' => 'Transaction not found'], 404);
        }

        return response()->json([
            'success' => true,
            'transaction_id' => $transaction->transaction_id,
            'status' => $transaction->status,
            'amount' => $transaction->amount,
            'currency' => $transaction->currency
        ]);
    }
} 