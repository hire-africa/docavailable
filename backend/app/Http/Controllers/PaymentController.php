<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Subscription;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Config;

class PaymentController extends Controller
{
    public function webhook(Request $request)
    {
        try {
            Log::info('Payment webhook received', ['headers' => $request->headers->all()]);

            // Step 1: Verify webhook signature (CRITICAL SECURITY REQUIREMENT)
            $payload = $request->getContent();
            // Accept common header variants just in case the provider changes casing/name
            $signature = $request->header('Signature')
                ?? $request->header('signature')
                ?? $request->header('X-Signature')
                ?? $request->header('x-signature')
                ?? $request->header('Paychangu-Signature')
                ?? $request->header('paychangu-signature');
            $webhookSecret = config('services.paychangu.webhook_secret');
            // Do not use webhook secret if it was mistakenly set to the webhook URL (e.g. https://...)
            if ($webhookSecret && (str_starts_with($webhookSecret, 'http://') || str_starts_with($webhookSecret, 'https://'))) {
                Log::warning('PAYCHANGU_WEBHOOK_SECRET appears to be a URL; use the actual secret key from PayChangu dashboard (e.g. whsec_...)');
                $webhookSecret = null;
            }
            $apiSecret = config('services.paychangu.secret_key');

            Log::info('Webhook verification details', [
                'has_signature' => !empty($signature),
                'has_webhook_secret' => !empty($webhookSecret),
                'payload_length' => strlen($payload)
            ]);

            if (!$signature || (!$webhookSecret && !$apiSecret)) {
                Log::error('Missing signature or webhook secret', [
                    'signature' => !empty($signature),
                    'webhook_secret' => !empty($webhookSecret),
                    'api_secret_present' => !empty($apiSecret)
                ]);
                return response()->json(['error' => 'Unauthorized - missing signature or secret'], 200);
            }

            // Compute HMAC using API secret first (PayChangu confirmed this is correct)
            $computedWithApiSecret = $apiSecret ? hash_hmac('sha256', $payload, $apiSecret) : null;
            $verified = $computedWithApiSecret && hash_equals($computedWithApiSecret, $signature);

            // If it doesn't match and we have webhook secret, try that as fallback
            if (!$verified && $webhookSecret && $webhookSecret !== 'whsec_your_webhook_secret_here') {
                $computedSignature = hash_hmac('sha256', $payload, $webhookSecret);
                if (hash_equals($computedSignature, $signature)) {
                    $verified = true;
                    Log::info('Webhook signature matched using webhook secret (fallback)');
                }
            }

            if (!$verified) {
                Log::error('Invalid webhook signature', [
                    'computed_with_api_secret' => $computedWithApiSecret,
                    'computed_with_webhook_secret' => $computedSignature ?? 'not_tried',
                    'received' => $signature,
                    'api_secret_present' => !empty($apiSecret),
                    'webhook_secret_present' => !empty($webhookSecret)
                ]);
                return response()->json(['error' => 'Invalid signature'], 200);
            }

            Log::info('Webhook signature verified successfully');

            // Step 2: Parse webhook data flexibly
            $data = $request->all();
            Log::info('Webhook payload received', ['data' => $data]);

            // FLEXIBLE EVENT TYPE CHECKING
            $eventType = $data['event_type'] ?? $data['event'] ?? 'unknown';
            $event = strtolower(trim($eventType));
            $allowedEventTypes = ['api.charge.payment', 'checkout.payment', 'payment.success', 'charge.success', 'transaction.completed'];
            
            if (!in_array($event, $allowedEventTypes, true)) {
                Log::info('Unsupported event type', ['event_type' => $eventType]);
                return response()->json(['message' => 'Event type not supported'], 200);
            }
            $data['event_type'] = $event;

            // FLEXIBLE STATUS CHECKING
            $status = strtolower($data['status'] ?? $data['data']['status'] ?? 'failed');
            $successStatuses = ['success', 'successful', 'completed', 'paid'];
            
            if (!in_array($status, $successStatuses)) {
                Log::info('Payment status not success', ['status' => $status]);
                return response()->json(['message' => 'Payment status not success'], 200);
            }

            // Step 4: Parse meta data flexibly (Payload can be string or object)
            $meta = [];
            if (isset($data['meta'])) {
                if (is_string($data['meta'])) {
                    $meta = json_decode($data['meta'], true) ?: [];
                } elseif (is_array($data['meta'])) {
                    $meta = $data['meta'];
                }
            }

            // Check for user_id and plan_id in meta OR at top level
            $userId = $meta['user_id'] ?? $data['user_id'] ?? $data['data']['user_id'] ?? null;
            $planId = $meta['plan_id'] ?? $data['plan_id'] ?? $data['data']['plan_id'] ?? null;

            if (!$userId) {
                Log::error('Payment webhook missing user_id', ['data' => $data, 'meta' => $meta]);
                return response()->json(['error' => 'Missing user_id'], 200);
            }

            // Sync meta for processSuccessfulPayment
            $meta['user_id'] = $userId;
            if ($planId) $meta['plan_id'] = $planId;

            // Step 5: Check payment status
            if (in_array($status, $successStatuses)) {
                // Step 6: ALWAYS RE-QUERY - Verify with PayChangu API before processing
                // Prefer tx_ref when available per PayChangu docs
                $transactionId = $data['tx_ref'] ?? $data['charge_id'] ?? $data['reference'] ?? null;
                if ($transactionId) {
                    Log::info('Verifying payment with PayChangu API', ['transaction_id' => $transactionId]);

                    $payChanguService = new \App\Services\PayChanguService();
                    $verification = $payChanguService->verify($transactionId);

                    if (!$verification['ok'] || ($verification['data']['status'] ?? '') !== 'success') {
                        Log::error('Payment verification failed', [
                            'transaction_id' => $transactionId,
                            'verification' => $verification
                        ]);
                        return response()->json(['message' => 'Payment verification failed'], 200);
                    }

                    Log::info('Payment verified successfully with PayChangu API', [
                        'transaction_id' => $transactionId,
                        'verification_data' => $verification['data']
                    ]);
                }

                return $this->processSuccessfulPayment($data, $meta);
            }

            Log::info('Payment status not success', ['status' => $data['status']]);
            return response()->json(['message' => 'Payment status not success'], 200);

        } catch (\Exception $e) {
            Log::error('Payment webhook error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => $e->getMessage()], 200);
        }
    }

    protected function processSuccessfulPayment($data, $meta)
    {
        try {
            Log::info('Starting payment processing with Paychangu data', ['data' => $data, 'meta' => $meta]);

            $userId = $meta['user_id'];
            $planId = $meta['plan_id'] ?? null;
            $amount = $data['amount'];
            $currency = $data['currency'];

            // Use correct Paychangu transaction ID fields (Flexible)
            $transactionId = $data['tx_ref'] ?? $data['charge_id'] ?? $data['reference'] ?? $data['data']['id'] ?? $data['data']['tx_ref'] ?? null;

            if (!$transactionId) {
                Log::error('Missing transaction ID in Paychangu webhook', ['data' => $data]);
                throw new \Exception('Missing transaction ID');
            }

            // ── FIX 5: Webhook deduplication ────────────────────────────────────────────
            // If this tx_ref was already processed + marked completed, return 200 early.
            // This prevents duplicate subscription grants when PayChangu retries the webhook.
            $existingTransaction = \App\Models\PaymentTransaction::where('transaction_id', $transactionId)
                ->where('status', 'completed')
                ->first();

            if ($existingTransaction) {
                Log::info('Duplicate webhook received — tx_ref already processed, skipping.', [
                    'transaction_id' => $transactionId,
                    'original_processed_at' => $existingTransaction->updated_at,
                    'user_id' => $userId,
                ]);
                return response()->json([
                    'success' => true,
                    'message' => 'Already processed (idempotent)',
                ], 200);
            }
            // ────────────────────────────────────────────────────────────────────────────

            // Find plan either by ID or by amount/currency
            $plan = null;
            if ($planId) {
                $plan = Plan::find($planId);
                Log::info('Looking up plan by ID', ['plan_id' => $planId, 'found' => !is_null($plan)]);
            }
            if (!$plan) {
                $plan = Plan::where('price', $amount)
                    ->where('currency', $currency)
                    ->first();
                Log::info('Looking up plan by amount/currency', [
                    'amount' => $amount,
                    'currency' => $currency,
                    'found' => !is_null($plan)
                ]);
            }

            // Build payment metadata using correct Paychangu fields
            $paymentMetadata = [
                'transaction_id' => $transactionId,
                'reference' => $data['reference'] ?? null,
                'charge_id' => $data['charge_id'] ?? null,
                'amount' => $amount,
                'currency' => $currency,
                'event_type' => $data['event_type'],
                'payment_method' => $data['authorization']['channel'] ?? 'Unknown',
                'completed_at' => $data['authorization']['completed_at'] ?? null,
                'created_at' => $data['created_at'] ?? null,
                'updated_at' => $data['updated_at'] ?? null,
                'mode' => $data['mode'] ?? null,
                'type' => $data['type'] ?? null
            ];

            // Add bank payment details if present
            if (isset($data['authorization']['bank_payment_details'])) {
                $paymentMetadata['bank_details'] = $data['authorization']['bank_payment_details'];
            }

            // Add mobile money details if present
            if (isset($data['authorization']['mobile_money'])) {
                $paymentMetadata['mobile_money'] = $data['authorization']['mobile_money'];
            }

            // Add card details if present
            if (isset($data['authorization']['card_details'])) {
                $paymentMetadata['card_details'] = $data['authorization']['card_details'];
            }

            // Use the centralized activatePlanForUser method
            if ($plan) {
                $subscription = $this->activatePlanForUser($userId, $plan->id, $transactionId);

                // Update with payment metadata
                $subscription->update([
                    'payment_metadata' => $paymentMetadata,
                    'payment_gateway' => 'paychangu'
                ]);
            } else {
                Log::error('No plan found for payment processing', [
                    'user_id' => $userId,
                    'plan_id' => $planId,
                    'amount' => $amount,
                    'currency' => $currency
                ]);
                throw new \Exception('No plan found for payment processing');
            }

            Log::info('Payment processed successfully', [
                'subscription_id' => $subscription->id,
                'transaction_id' => $transactionId
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Payment processed successfully',
                'subscription' => $subscription
            ]);
        } catch (\Exception $e) {
            Log::error('Error processing payment', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'data' => $data,
                'meta' => $meta
            ]);

            if (strpos($e->getMessage(), 'constraint') !== false) {
                return response()->json([
                    'error' => 'Database constraint violation - check subscription table structure'
                ], 500);
            }

            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function initiate(Request $request)
    {
        try {
            Log::info('Payment initiation request received', ['data' => $request->all()]);

            // Get authenticated user
            $user = auth()->user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }

            // Validate required fields
            $request->validate([
                'plan_id' => 'required|integer|exists:plans,id'
            ]);

            // Get plan
            $plan = \App\Models\Plan::findOrFail($request->plan_id);

            // Use plan data for payment
            $amount = $plan->price;
            $currency = $plan->currency ?? 'MWK';

            // Get user data from authenticated user
            $email = $user->email;
            $firstName = $user->first_name ?? explode(' ', $user->display_name ?? $user->name ?? 'User')[0];
            $lastName = $user->last_name ?? (count(explode(' ', $user->display_name ?? $user->name ?? 'User')) > 1 ? explode(' ', $user->display_name ?? $user->name ?? 'User')[1] : 'User');
            $phone = $user->phone ?? '+265000000000'; // Default phone if not set

            // Generate unique transaction ID with microtime for better uniqueness
            $timestamp = microtime(true);
            $transactionId = 'TXN_' . str_replace('.', '', $timestamp) . '_' . $user->id;

            // Create transaction record
            $transaction = \App\Models\PaymentTransaction::create([
                'transaction_id' => $transactionId,
                'user_id' => $user->id,
                'amount' => $amount,
                'currency' => $currency,
                'gateway' => 'paychangu',
                'status' => 'pending',
                'reference' => $transactionId,
                'metadata' => [
                    'plan_id' => $plan->id,
                    'plan_name' => $plan->name,
                    'user_email' => $user->email,
                    'user_name' => $user->display_name
                ]
            ]);

            // Prepare PayChangu payload
            $payload = [
                'amount' => $amount,
                'currency' => $currency,
                'email' => $email,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'phone' => $phone,
                'tx_ref' => $transaction->reference,
                'callback_url' => config('services.paychangu.callback_url'),
                'return_url' => config('services.paychangu.return_url'),
                'meta' => [
                    'user_id' => $user->id,
                    'plan_id' => $plan->id,
                    'transaction_id' => $transaction->id
                ]
            ];

            // Initialize PayChangu service
            $payChanguService = new \App\Services\PayChanguService();
            $result = $payChanguService->initiate($payload);

            if (!$result['ok']) {
                Log::error('PayChangu initiation failed', ['result' => $result]);
                return response()->json([
                    'success' => false,
                    'message' => 'Payment initiation failed',
                    'error' => $result['error'] ?? 'Unknown error'
                ], 500);
            }

            // Update transaction with checkout URL
            $transaction->update([
                'gateway_reference' => $result['tx_ref'] ?? $transaction->reference,
                'metadata' => array_merge($transaction->metadata ?? [], [
                    'checkout_url' => $result['checkout_url'] ?? null,
                    'gateway_response' => $result['response'] ?? $result
                ])
            ]);

            if (!$result['checkout_url']) {
                Log::error('No checkout URL in PayChangu response', ['result' => $result]);
                return response()->json([
                    'success' => false,
                    'message' => 'Payment initiation failed - no checkout URL received',
                    'error' => 'No checkout URL in response'
                ], 500);
            }

            return response()->json([
                'success' => true,
                'message' => 'Payment initiated successfully',
                'data' => [
                    'checkout_url' => $result['checkout_url'],
                    'transaction_id' => $transaction->id,
                    'reference' => $transaction->reference
                ]
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Payment initiation validation error', ['errors' => $e->errors()]);
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Payment initiation error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Payment initiation failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function callback(Request $request)
    {
        try {
            Log::info('PayChangu callback received', ['data' => $request->all()]);

            $txRef = $request->query('tx_ref');
            $status = $request->query('status');

            if (!$txRef) {
                return response()->json(['error' => 'Missing tx_ref parameter'], 400);
            }

            Log::info('PayChangu callback parameters', [
                'tx_ref' => $txRef,
                'status' => $status,
                'all_params' => $request->all()
            ]);

            // Find transaction
            $transaction = \App\Models\PaymentTransaction::where('reference', $txRef)
                ->orWhere('gateway_reference', $txRef)
                ->first();

            if (!$transaction) {
                Log::error('Transaction not found for callback', ['tx_ref' => $txRef]);
                return response()->json(['error' => 'Transaction not found'], 404);
            }

            // Check status from PayChangu callback first
            if ($status === 'success') {
                Log::info('PayChangu callback indicates success', ['tx_ref' => $txRef]);

                // Verify payment with PayChangu API to be sure
                $payChanguService = new \App\Services\PayChanguService();
                $verification = $payChanguService->verify($txRef);

                if ($verification['ok'] && ($verification['data']['status'] ?? '') === 'success') {
                    $transaction->update([
                        'status' => 'completed',
                        'metadata' => array_merge($transaction->metadata ?? [], [
                            'verification_response' => $verification['data'],
                            'callback_status' => $status,
                            'completed_at' => now()->toISOString()
                        ])
                    ]);

                    // Process the successful payment
                    $meta = json_decode($verification['data']['meta'] ?? '{}', true);
                    $this->processSuccessfulPayment($verification['data'], $meta);

                    // If this is a browser redirect (GET), return the HTML redirect page
                    if ($request->isMethod('get')) {
                        return $this->renderRedirectPage($transaction, $txRef, 'success');
                    }

                    // Return success response to PayChangu (Webhooks)
                    return response()->json([
                        'success' => true,
                        'message' => 'Payment processed successfully',
                        'tx_ref' => $txRef
                    ]);
                } else {
                    Log::error('PayChangu verification failed despite success status', [
                        'tx_ref' => $txRef,
                        'verification' => $verification
                    ]);

                    if ($request->isMethod('get')) {
                        return $this->renderRedirectPage($transaction, $txRef, 'error');
                    }

                    return response()->json(['error' => 'Payment verification failed'], 400);
                }
            } else {
                Log::info('PayChangu callback indicates failure', ['tx_ref' => $txRef, 'status' => $status]);

                $transaction->update([
                    'status' => 'failed',
                    'metadata' => array_merge($transaction->metadata ?? [], [
                        'callback_status' => $status,
                        'failed_at' => now()->toISOString()
                    ])
                ]);

                if ($request->isMethod('get')) {
                    return $this->renderRedirectPage($transaction, $txRef, 'error');
                }

                return response()->json(['error' => 'Payment failed'], 400);
            }
        } catch (\Exception $e) {
            Log::error('PayChangu callback error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            if ($request->isMethod('get')) {
                return $this->renderRedirectPage(null, $request->query('tx_ref', 'unknown'), 'error');
            }

            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function returnHandler(Request $request)
    {
        Log::info('PayChangu return handler received', ['data' => $request->all()]);

        $txRef = $request->query('tx_ref') ?? $request->query('transaction_id') ?? $request->query('reference');
        $status = $request->query('status');

        if (!$txRef) {
            return $this->renderRedirectPage(null, 'unknown', 'error');
        }

        $transaction = \App\Models\PaymentTransaction::where('reference', $txRef)
            ->orWhere('gateway_reference', $txRef)
            ->first();

        // Update transaction status if it exists and status is provided
        if ($transaction && $status) {
            $transaction->update(['status' => ($status === 'success' ? 'completed' : 'failed')]);
        }

        return $this->renderRedirectPage($transaction, $txRef, $status === 'success' ? 'success' : 'error');
    }

    /**
     * Common helper to render the HTML redirect page for WebView
     */
    private function renderRedirectPage($transaction, $txRef, $status)
    {
        $final_status = $transaction ? $transaction->status : $status;
        // Frontend URL for browser redirect after payment (must be a valid absolute URL)
        $frontendUrl = rtrim((string) config('app.frontend_url', 'https://docavailable.com'), '/');
        if (!preg_match('#^https?://#i', $frontendUrl)) {
            $frontendUrl = 'https://docavailable.com';
        }
        $redirectUrl = $frontendUrl . '/?payment_status=' . urlencode($final_status) . '&tx_ref=' . urlencode($txRef);

        // Return a invisible, instant redirect page
        $html = '<!DOCTYPE html>
<html>
<head>
    <title>Processing Result...</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="background: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; font-family: sans-serif;">
    <div style="text-align: center;">
        <div style="border: 4px solid #f3f3f3; border-top: 4px solid #28a745; border-radius: 50%; width: 30px; height: 30px; animation: spin 2s linear infinite; margin: 0 auto 10px;"></div>
        <p style="color: #666; font-size: 14px;">Returning to app...</p>
    </div>
    <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
    <script>
        function doRedirect() {
            // 1. Signal WebView via postMessage (Primary closure mechanism)
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: "close_window",
                    status: "' . $final_status . '",
                    tx_ref: "' . $txRef . '"
                }));
            } else {
                // 2. Browser/tab fallback: redirect back to main app URL
                // This handles flows where checkout was opened in a new tab or external browser.
                setTimeout(function() {
                    window.location.href = ' . json_encode($redirectUrl) . ';
                }, 1500);
            }
        }

        // Execute closure signal immediately
        doRedirect();
        
        // Manual fallback for deep link if needed
        function manualDeepLink() {
            const deepLink = "com.docavailable.app://payment-result?status=" + 
                encodeURIComponent("' . $final_status . '") + 
                "&tx_ref=" + encodeURIComponent("' . $txRef . '");
            window.location.href = deepLink;
        }
    </script>
</body>
</html>';

        return response($html);
    }

    public function checkStatus(Request $request)
    {
        try {
            $txRef = $request->query('tx_ref') ?? $request->query('transaction_id');

            if (!$txRef) {
                return response()->json([
                    'success' => false,
                    'message' => 'Missing tx_ref or transaction_id parameter'
                ], 400);
            }

            Log::info('Payment status check requested', ['tx_ref' => $txRef]);

            // STEP 1: Check database first — webhook may have already marked it completed
            $transaction = \App\Models\PaymentTransaction::where('reference', $txRef)
                ->orWhere('gateway_reference', $txRef)
                ->first();

            if ($transaction && $transaction->status === 'completed') {
                Log::info('Payment confirmed in database', ['tx_ref' => $txRef]);
                return response()->json([
                    'success' => true,
                    'message' => 'Payment verified from database',
                    'data' => [
                        'status' => 'success',
                        'tx_ref' => $txRef,
                        'transaction_id' => $transaction->id,
                        'amount' => $transaction->amount,
                        'currency' => $transaction->currency
                    ]
                ]);
            }

            // STEP 2: Transaction exists but is still pending — return 200 so the frontend
            // keeps polling without treating it as an error. Don't call PayChangu's verify
            // API here because PayChangu returns non-2xx for unpaid tx_refs, which looks
            // like a hard failure when it's just the normal "user hasn't paid yet" state.
            if ($transaction && $transaction->status === 'pending') {
                Log::info('Transaction pending, waiting for webhook', ['tx_ref' => $txRef]);
                return response()->json([
                    'success' => false,
                    'message' => 'Payment pending',
                    'data' => [
                        'status' => 'pending',
                        'tx_ref' => $txRef
                    ]
                ]);
            }

            // STEP 3: Transaction not in DB at all, or in a failed state — call PayChangu
            // to get the definitive status (e.g. user completed payment but webhook hasn't fired yet)
            Log::info('Checking PayChangu API for transaction status', ['tx_ref' => $txRef]);
            $payChanguService = new \App\Services\PayChanguService();
            $verification = $payChanguService->verify($txRef);

            if (!$verification['ok']) {
                Log::warning('PayChangu verify API call failed', ['tx_ref' => $txRef, 'error' => $verification['error']]);
                return response()->json([
                    'success' => false,
                    'message' => 'Payment pending',
                    'data' => ['status' => 'pending', 'tx_ref' => $txRef]
                ]);
            }

            $data = $verification['data'];

            if (!$data || !isset($data['status'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Payment pending',
                    'data' => ['status' => 'pending', 'tx_ref' => $txRef]
                ]);
            }

            if ($data['status'] === 'success') {
                if ($transaction) {
                    $transaction->update([
                        'status' => 'completed',
                        'metadata' => array_merge($transaction->metadata ?? [], [
                            'verification_response' => $verification['body'],
                            'verified_at' => now()->toISOString()
                        ])
                    ]);
                }

                return response()->json([
                    'success' => true,
                    'message' => 'Payment verified successfully',
                    'data' => [
                        'status' => $data['status'],
                        'amount' => $data['amount'] ?? null,
                        'currency' => $data['currency'] ?? null,
                        'tx_ref' => $data['tx_ref'] ?? $txRef,
                        'reference' => $data['reference'] ?? null,
                        'transaction_id' => $transaction->id ?? null
                    ]
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Payment not yet completed',
                    'data' => [
                        'status' => $data['status'],
                        'tx_ref' => $data['tx_ref'] ?? $txRef
                    ]
                ]);
            }

        } catch (\Exception $e) {
            Log::error('Payment status check error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Payment status check failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function testWebhook(Request $request)
    {
        try {
            // Create test payment data in PayChangu format according to their documentation
            $testData = [
                'event_type' => 'api.charge.payment',
                'currency' => $request->input('currency', 'MWK'),
                'amount' => $request->input('amount', 1000),
                'charge' => '20',
                'mode' => 'test',
                'type' => 'Direct API Payment',
                'status' => 'success',
                'charge_id' => 'test_' . time(),
                'reference' => 'TEST_' . time(),
                'authorization' => [
                    'channel' => 'Mobile Money',
                    'card_details' => null,
                    'bank_payment_details' => null,
                    'mobile_money' => [
                        'operator' => 'Airtel Money',
                        'mobile_number' => '+265123xxxx89'
                    ],
                    'completed_at' => now()->toISOString()
                ],
                'created_at' => now()->toISOString(),
                'updated_at' => now()->toISOString(),
                'meta' => json_encode([
                    'user_id' => $request->input('user_id', 11),
                    'plan_id' => $request->input('plan_id')
                ])
            ];

            Log::info('Test webhook data created', ['test_data' => $testData]);

            // Create a new request with the test data
            $testRequest = new Request($testData);

            // Call the webhook method directly
            return $this->webhook($testRequest);

        } catch (\Exception $e) {
            Log::error('Test webhook error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Test webhook failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Activate plan for user after successful payment
     */
    protected function activatePlanForUser($userId, $planId, $transactionId)
    {
        try {
            $plan = Plan::findOrFail($planId);
            $user = User::findOrFail($userId);

            Log::info('Activating plan for user (stacking – always creates new subscription)', [
                'user_id' => $userId,
                'plan_id' => $planId,
                'transaction_id' => $transactionId
            ]);

            // Always create a new subscription row (stacking model).
            // Old active subscriptions keep their sessions and expire independently.
            $subscriptionData = [
                'user_id' => $userId,
                'plan_id' => $planId,
                'plan_name' => $plan->name,
                'plan_price' => $plan->price,
                'plan_currency' => $plan->currency,
                'status' => 1,
                'start_date' => now(),
                'end_date' => now()->addDays($plan->duration),
                'is_active' => true,
                'payment_transaction_id' => $transactionId,
                'payment_status' => 'completed',
                'text_sessions_remaining' => $plan->text_sessions,
                'voice_calls_remaining' => $plan->voice_calls,
                'video_calls_remaining' => $plan->video_calls,
                'total_text_sessions' => $plan->text_sessions,
                'total_voice_calls' => $plan->voice_calls,
                'total_video_calls' => $plan->video_calls,
                'activated_at' => now()
            ];

            $subscription = Subscription::create($subscriptionData);

            Log::info('Created new stacked subscription', [
                'subscription_id' => $subscription->id,
                'user_id' => $userId,
                'plan_id' => $planId
            ]);

            // Send subscription activated notification
            try {
                $notificationService = new \App\Services\NotificationService();
                $notificationService->createNotification(
                    $userId,
                    'Subscription Activated',
                    'Your subscription plan has been activated successfully.',
                    'subscription',
                    [
                        'subscription_id' => $subscription->id,
                        'plan_name' => $plan->name,
                    ]
                );
            } catch (\Exception $notificationError) {
                Log::warning("Failed to send subscription activated notification", [
                    'subscription_id' => $subscription->id,
                    'user_id' => $userId,
                    'error' => $notificationError->getMessage()
                ]);
            }

            return $subscription;
        } catch (\Exception $e) {
            Log::error('Failed to activate plan for user: ' . $e->getMessage(), [
                'user_id' => $userId,
                'plan_id' => $planId,
                'transaction_id' => $transactionId,
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }
}
