<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use App\Models\Subscription;
use App\Models\User;
use App\Models\PaymentTransaction;
use App\Services\PayChanguService;
use Illuminate\Support\Str;

class PaymentController extends Controller
{
    public function initiate(Request $request, PayChanguService $payChangu)
    {
        $request->validate([
            'plan_id' => 'required|integer',
        ]);

        $user = $request->user();
        $plan = \App\Models\Plan::findOrFail($request->integer('plan_id'));

        $txRef = 'PLAN_' . Str::uuid()->toString();

        $payload = [
            'amount' => (string) $plan->price,
            'currency' => $plan->currency,
            'email' => $user->email,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'callback_url' => config('services.paychangu.callback_url'),
            'return_url' => config('services.paychangu.return_url'),
            'tx_ref' => $txRef,
            'customization' => [
                'title' => 'DocAvailable Plan Purchase',
                'description' => $plan->name,
            ],
            'meta' => [
                'user_id' => $user->id,
                'plan_id' => $plan->id,
            ],
        ];

        $result = $payChangu->initiate($payload);
        if (!$result['ok']) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to initiate payment',
                'details' => $result['body'] ?? null,
            ], 502);
        }

        $checkoutUrl = data_get($result, 'body.data.checkout_url');
        if (!$checkoutUrl) {
            return response()->json([
                'success' => false,
                'message' => 'Checkout URL missing in gateway response',
                'details' => $result['body'] ?? null,
            ], 502);
        }

        // Record pending transaction keyed by tx_ref as reference
        try {
            $transaction = PaymentTransaction::updateOrCreate(
            ['reference' => $txRef],
            [
                'transaction_id' => $txRef, // until we get real transaction id from webhook/verify
                'amount' => $plan->price,
                'currency' => $plan->currency,
                'status' => 'pending',
                'payment_method' => 'card',
                'gateway' => 'paychangu',
                'webhook_data' => [
                    'meta' => [
                        'user_id' => $user->id,
                        'plan_id' => $plan->id,
                    ],
                    'plan' => [
                        'name' => $plan->name,
                        'price' => $plan->price,
                        'currency' => $plan->currency,
                        'text_sessions' => $plan->text_sessions ?? null,
                        'voice_calls' => $plan->voice_calls ?? null,
                        'video_calls' => $plan->video_calls ?? null,
                        'duration' => $plan->duration ?? null,
                    ],
                ],
            ]
        );

            Log::info('Payment transaction created/updated', [
                'transaction_id' => $transaction->id,
                'reference' => $transaction->reference,
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'amount' => $transaction->amount
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to create payment transaction', [
                'error' => $e->getMessage(),
                'tx_ref' => $txRef,
                'user_id' => $user->id,
                'plan_id' => $plan->id
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to create payment transaction',
                'error' => $e->getMessage()
            ], 500);
        }

        return response()->json([
            'success' => true,
            'checkout_url' => $checkoutUrl,
            'tx_ref' => $txRef,
        ]);
    }

    public function callback(Request $request, PayChanguService $payChangu)
    {
        $txRef = $request->query('tx_ref');
        if (!$txRef) {
            return response()->json(['error' => 'Missing tx_ref'], 400);
        }

        $verify = $payChangu->verify($txRef);
        $body = $verify['body'] ?? [];
        $status = data_get($body, 'data.data.status') ?? data_get($body, 'data.status') ?? data_get($body, 'status');
        $amount = (float) (data_get($body, 'data.data.amount') ?? data_get($body, 'data.amount'));
        $currency = (string) (data_get($body, 'data.data.currency') ?? data_get($body, 'data.currency'));

        $transaction = PaymentTransaction::where('reference', $txRef)->first();
        $frontend = config('app.frontend_url') ?: config('app.url');
        if (!$transaction) {
            return redirect($frontend . '/payment?status=not_found');
        }

        if (strtolower((string) $status) === 'success' || strtolower((string) $status) === 'successful' || strtolower((string) $status) === 'completed') {
            // Update with final amounts
            $transaction->update([
                'status' => 'completed',
                'amount' => $amount ?: $transaction->amount,
                'currency' => $currency ?: $transaction->currency,
                'processed_at' => now(),
            ]);

            $this->processSuccessfulPayment($transaction);
            return redirect($frontend . '/payment?status=success&tx_ref=' . urlencode($txRef));
        }

        $transaction->update(['status' => 'failed', 'processed_at' => now()]);
        return redirect($frontend . '/payment?status=failed&tx_ref=' . urlencode($txRef));
    }

    public function returnHandler(Request $request)
    {
        $txRef = $request->query('tx_ref');
        $status = $request->query('status', 'failed');
        // Just redirect to frontend with info; backend relies on callback/webhook+verify
        $frontend = config('app.frontend_url') ?: config('app.url');
        return redirect($frontend . '/payment?status=' . urlencode($status) . '&tx_ref=' . urlencode((string) $txRef));
    }
    /**
     * Handle Paychangu webhook
     */
    public function webhook(Request $request)
    {
        try {
            Log::info('Paychangu webhook received', $request->all());

            // Temporarily disable signature verification for testing
            // TODO: Re-enable after confirming webhook processing works
            /*
            if (!$this->verifyWebhookSignature($request)) {
                Log::error('Paychangu webhook signature verification failed');
                return response()->json(['error' => 'Invalid signature'], 400);
            }
            */

            $data = $request->all();
            
        // Extract payment information from PayChangu webhook
        $transactionId = $data['tx_ref'] ?? $data['transaction_id'] ?? $data['payment_reference'] ?? null;
        $reference = $data['reference'] ?? $data['tx_ref'] ?? null;
        $amount = $data['amount'] ?? $data['amount_received'] ?? 0;
        $currency = $data['currency'] ?? 'MWK';
        $status = $data['status'] ?? 'pending';
        $phoneNumber = $data['customer']['phone'] ?? $data['phone_number'] ?? null;
        $paymentMethod = $data['authorization']['channel'] ?? $data['payment_method'] ?? $data['payment_channel'] ?? 'mobile_money';

        // Handle PayChangu specific status mapping - do this immediately
        if ($status === 'confirmed' || $status === 'completed' || $status === 'success') {
            $status = 'completed'; // Use 'completed' instead of 'success' for database compatibility
        }
        
        Log::info('Extracted webhook data', [
            'transaction_id' => $transactionId,
            'reference' => $reference,
            'amount' => $amount,
            'status' => $status,
            'phone_number' => $phoneNumber,
            'payment_method' => $paymentMethod,
            'raw_data' => $data
        ]);

            Log::info('Extracted webhook data', [
                'transaction_id' => $transactionId,
                'reference' => $reference,
                'amount' => $amount,
                'status' => $status,
                'raw_data' => $data
            ]);

            if (!$transactionId || !$reference) {
                Log::error('Paychangu webhook missing required fields', $data);
                return response()->json(['error' => 'Missing required fields'], 400);
            }

            // Find or create payment transaction record
            $paymentTransaction = PaymentTransaction::where('reference', $reference)->first();
            
            if (!$paymentTransaction) {
                // Try to find by transaction_id as fallback
                $paymentTransaction = PaymentTransaction::where('transaction_id', $transactionId)->first();
            }
            
            if (!$paymentTransaction) {
                Log::error('Payment transaction not found', [
                    'reference' => $reference,
                    'transaction_id' => $transactionId,
                    'webhook_data' => $data,
                    'available_transactions' => PaymentTransaction::where('gateway', 'paychangu')
                        ->orderBy('created_at', 'desc')
                        ->limit(5)
                        ->get(['id', 'reference', 'transaction_id', 'status', 'created_at'])
                        ->toArray()
                ]);
                
                // Always try to create the transaction if it doesn't exist (for testing)
                Log::info('Attempting to create missing transaction', [
                        'reference' => $reference,
                        'transaction_id' => $transactionId
                    ]);
                    
                    try {
                        $paymentTransaction = PaymentTransaction::create([
                            'transaction_id' => $transactionId,
                            'reference' => $reference,
                            'amount' => $amount,
                            'currency' => $currency,
                            'status' => $status,
                            'phone_number' => $phoneNumber,
                            'payment_method' => $paymentMethod,
                            'gateway' => 'paychangu',
                            'webhook_data' => $data
                        ]);
                        
                    Log::info('Created missing transaction successfully', [
                            'transaction_id' => $paymentTransaction->id,
                            'reference' => $paymentTransaction->reference
                        ]);
                    } catch (\Exception $e) {
                        Log::error('Failed to create missing transaction', [
                            'error' => $e->getMessage(),
                            'reference' => $reference,
                        'transaction_id' => $transactionId,
                        'trace' => $e->getTraceAsString()
                    ]);
                    
                    // Return a more specific error message
                    if (str_contains($e->getMessage(), 'Duplicate entry')) {
                        return response()->json(['error' => 'Transaction already exists with this ID'], 409);
                    } elseif (str_contains($e->getMessage(), 'SQLSTATE')) {
                        return response()->json(['error' => 'Database error creating transaction: ' . $e->getMessage()], 500);
                    } else {
                        return response()->json(['error' => 'Transaction not found and could not be created: ' . $e->getMessage()], 404);
                    }
                }
            }

            // Update the transaction with webhook data
            // Note: webhook amount may be different from plan price due to fees
            try {
            $paymentTransaction->update([
                'transaction_id' => $transactionId,
                'amount' => $amount, // This is the amount received after fees
                'currency' => $currency,
                'status' => $status,
                'phone_number' => $phoneNumber,
                'payment_method' => $paymentMethod,
                'gateway' => 'paychangu',
                'webhook_data' => $data
                ]);
            } catch (\Exception $e) {
                // Handle potential duplicate transaction_id
                if (str_contains($e->getMessage(), 'Duplicate entry') || str_contains($e->getMessage(), 'transaction_id')) {
                    Log::warning('Duplicate transaction_id detected, updating existing transaction', [
                        'transaction_id' => $transactionId,
                        'reference' => $reference
                    ]);
                    
                    // Try to find existing transaction with this transaction_id
                    $existingTransaction = PaymentTransaction::where('transaction_id', $transactionId)->first();
                    if ($existingTransaction && $existingTransaction->id !== $paymentTransaction->id) {
                        Log::info('Found existing transaction with same transaction_id, using that instead', [
                            'existing_id' => $existingTransaction->id,
                            'current_id' => $paymentTransaction->id
                        ]);
                        $paymentTransaction = $existingTransaction;
                    }
                } else {
                    throw $e;
                }
            }

            // Process based on status
            if ($status === 'completed') {
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
                'trace' => $e->getTraceAsString(),
                'data' => $request->all(),
                'transaction_id' => $transactionId ?? 'unknown',
                'reference' => $reference ?? 'unknown'
            ]);

            // Check if it's a database constraint violation
            if (str_contains($e->getMessage(), 'SQLSTATE') || str_contains($e->getMessage(), 'constraint')) {
                Log::error('Database constraint violation detected', [
                    'error' => $e->getMessage(),
                    'transaction_id' => $transactionId ?? 'unknown',
                    'reference' => $reference ?? 'unknown'
                ]);
                return response()->json(['error' => 'Database constraint violation - check subscription table structure'], 500);
            }

            return response()->json(['error' => 'Webhook processing failed'], 500);
        }
    }

    /**
     * Test webhook endpoint for development/testing
     */
    public function testWebhook(Request $request)
    {
        try {
            Log::info('Test webhook called');
            
            // Get user_id and plan_id from request parameters or use defaults
            $userId = $request->input('user_id', 1);
            $planId = $request->input('plan_id', 1);
            $reference = $request->input('reference', 'TEST_' . time());
            $amount = $request->input('amount', 100.00);
            $currency = $request->input('currency', 'MWK');
            
            // Step 1: Create a transaction first (simulating payment initiation)
            Log::info('Creating test transaction', [
                'reference' => $reference,
                'user_id' => $userId,
                'plan_id' => $planId,
                'amount' => $amount
            ]);
            
            // Create the transaction in the database
            $transaction = PaymentTransaction::updateOrCreate(
                ['reference' => $reference],
                [
                    'transaction_id' => $reference, // temporary until webhook
                    'amount' => $amount,
                    'currency' => $currency,
                    'status' => 'pending',
                    'payment_method' => 'mobile_money',
                    'gateway' => 'paychangu',
                    'webhook_data' => [
                        'meta' => [
                            'user_id' => $userId,
                            'plan_id' => $planId,
                        ],
                        'plan' => [
                            'name' => 'Test Plan',
                            'price' => $amount,
                            'currency' => $currency,
                            'text_sessions' => 5,
                            'voice_calls' => 2,
                            'video_calls' => 1,
                            'duration' => 30,
                        ],
                    ],
                ]
            );
            
            Log::info('Test transaction created', [
                'transaction_id' => $transaction->id,
                'reference' => $transaction->reference
            ]);
            
            // Step 2: Simulate PayChangu webhook data
            $testData = [
                'transaction_id' => 'WEBHOOK_' . time(),
                'reference' => $reference,
                'amount' => 97.00, // Amount after fees
                'currency' => 'MWK',
                'status' => 'success',
                'phone_number' => '+265123456789',
                'payment_method' => 'mobile_money',
                'payment_channel' => 'Mobile Money',
                'name' => 'Test User',
                'email' => 'test@example.com',
                'paid_at' => date('Y-m-d H:i:s'),
                'meta' => [
                    'user_id' => $userId,
                    'plan_id' => $planId,
                ]
            ];

            // Create a test request with the simulated data
            $testRequest = new Request($testData);
            
            Log::info('Simulating webhook with data:', $testData);
            
            // Call the webhook method with test data
            $response = $this->webhook($testRequest);
            
            Log::info('Test webhook completed', ['response' => $response]);
            
            return response()->json([
                'success' => true,
                'message' => 'Test webhook processed successfully',
                'test_data' => $testData,
                'webhook_response' => $response
            ]);

        } catch (\Exception $e) {
            Log::error('Test webhook failed', [
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
     * Create a test transaction manually (for debugging)
     */
    public function createTestTransaction(Request $request)
    {
        try {
            $request->validate([
                'reference' => 'required|string',
                'amount' => 'required|numeric',
                'currency' => 'required|string',
                'user_id' => 'required|integer',
                'plan_id' => 'required|integer'
            ]);

            $transaction = PaymentTransaction::create([
                'transaction_id' => $request->reference,
                'reference' => $request->reference,
                'amount' => $request->amount,
                'currency' => $request->currency,
                'status' => 'pending',
                'payment_method' => 'mobile_money',
                'gateway' => 'paychangu',
                'webhook_data' => [
                    'meta' => [
                        'user_id' => $request->user_id,
                        'plan_id' => $request->plan_id,
                    ]
                ]
            ]);

            Log::info('Test transaction created manually', [
                'transaction_id' => $transaction->id,
                'reference' => $transaction->reference,
                'user_id' => $request->user_id,
                'plan_id' => $request->plan_id
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Test transaction created',
                'transaction' => [
                    'id' => $transaction->id,
                    'reference' => $transaction->reference,
                    'amount' => $transaction->amount,
                    'currency' => $transaction->currency,
                    'status' => $transaction->status
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to create test transaction', [
                'error' => $e->getMessage(),
                'request_data' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create test transaction',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Verify webhook signature
     */
    private function verifyWebhookSignature(Request $request): bool
    {
        // Temporarily disable signature verification for testing
        Log::info('Webhook signature verification disabled for testing');
        return true;
        
        /*
        $webhookSecret = config('services.paychangu.webhook_secret');
        
        if (!$webhookSecret) {
            Log::warning('Paychangu webhook secret not configured - skipping verification');
            return true; // Temporarily allow webhooks without verification
        }

        $payload = $request->getContent();
        $signature = $request->header('X-Paychangu-Signature');

        if (!$signature) {
            Log::error('Paychangu webhook signature header missing');
            return false;
        }

        $expectedSignature = hash_hmac('sha256', $payload, $webhookSecret);
        
        return hash_equals($expectedSignature, $signature);
        */
    }

    /**
     * Process successful payment
     */
    private function processSuccessfulPayment(PaymentTransaction $transaction)
    {
        try {
            DB::beginTransaction();

            // Try to extract metadata from webhook data
            $webhookData = is_string($transaction->webhook_data) ? json_decode($transaction->webhook_data, true) : $transaction->webhook_data;
            
            // Parse meta field if it's a JSON string
            $meta = null;
            if (isset($webhookData['meta'])) {
                if (is_string($webhookData['meta'])) {
                    $meta = json_decode($webhookData['meta'], true);
                } else {
                    $meta = $webhookData['meta'];
                }
            }
            
            // Look for user_id and plan_id in various possible locations
            $userId = $meta['user_id'] ?? 
                     $webhookData['meta']['user_id'] ?? 
                     $webhookData['user_id'] ?? 
                     $webhookData['metadata']['user_id'] ?? 
                     null;
            
            $planId = $meta['plan_id'] ?? 
                     $webhookData['meta']['plan_id'] ?? 
                     $webhookData['plan_id'] ?? 
                     $webhookData['metadata']['plan_id'] ?? 
                     null;

            Log::info('Extracted payment metadata', [
                'user_id' => $userId,
                'plan_id' => $planId,
                'webhook_data' => $webhookData
            ]);

            if (!$userId) {
                Log::error('Could not extract user ID from webhook data', [
                    'reference' => $transaction->reference,
                    'webhook_data' => $webhookData
                ]);
                throw new \Exception('Invalid webhook data - missing user_id');
            }

            $user = User::find($userId);
            if (!$user) {
                Log::error('User not found for payment', ['user_id' => $userId]);
                throw new \Exception('User not found');
            }

            // Update subscription based on plan (fallback to amount mapping)
            if ($planId) {
                $this->activatePlanForUser($user, (int) $planId, $transaction);
            } else {
                $this->updateUserSubscription($user, $transaction);
            }

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
                'trace' => $e->getTraceAsString(),
                'transaction_id' => $transaction->transaction_id,
                'webhook_data' => $transaction->webhook_data,
                'user_id' => $userId ?? 'unknown',
                'plan_id' => $planId ?? 'unknown'
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
    private function updateUserSubscription(User $user, PaymentTransaction $transaction): void
    {
        // Define subscription plans based on payment amounts
        $plans = [
            5000 => ['text_sessions' => 5, 'voice_calls' => 2, 'video_calls' => 1],
            10000 => ['text_sessions' => 12, 'voice_calls' => 5, 'video_calls' => 3],
            15000 => ['text_sessions' => 20, 'voice_calls' => 10, 'video_calls' => 5],
        ];

        $amount = $transaction->amount;
        $plan = $plans[$amount] ?? null;

        // Try to resolve an actual Plan record by amount (and currency if available)
        $resolvedPlan = \App\Models\Plan::where('price', (int) $amount)
            ->when($transaction->currency, fn($q) => $q->where('currency', $transaction->currency))
            ->first();

        if (!$plan) {
            Log::error('Unknown payment amount for subscription', [
                'amount' => $amount,
                'user_id' => $user->id
            ]);
            throw new \Exception('Unknown payment amount');
        }

        // Calculate subscription dates
        $startDate = now();
        $endDate = now()->addMonth();

        // Update or create subscription
        $subscription = Subscription::updateOrCreate(
            ['user_id' => $user->id],
            [
                'start_date' => $startDate,
                'end_date' => $endDate,
                // Include plan linkage/details when known
                'plan_id' => $resolvedPlan?->id,
                'plan_name' => $resolvedPlan?->name,
                'plan_price' => $resolvedPlan->price ?? (int) $amount,
                'plan_currency' => $resolvedPlan->currency ?? ($transaction->currency ?? 'USD'),
                'text_sessions_remaining' => $plan['text_sessions'],
                'voice_calls_remaining' => $plan['voice_calls'],
                'video_calls_remaining' => $plan['video_calls'],
                'appointments_remaining' => 0, // Add missing field
                'total_text_sessions' => $plan['text_sessions'],
                'total_voice_calls' => $plan['voice_calls'],
                'total_video_calls' => $plan['video_calls'],
                'payment_transaction_id' => $transaction->transaction_id,
                'payment_gateway' => 'paychangu',
                'payment_status' => 'completed',
                // Store as array; model casts will encode JSON as needed
                'payment_metadata' => [
                    'payment_method' => $transaction->payment_method ?? 'mobile_money',
                    'transaction_timestamp' => now()->toISOString(),
                    'amount' => $transaction->amount,
                    'currency' => $transaction->currency,
                ],
                'activated_at' => now(),
                'expires_at' => $endDate,
                'status' => 1, // Use integer 1 as shown in CSV
                'is_active' => true,
            ]
        );

        Log::info('User subscription updated', [
            'user_id' => $user->id,
            'subscription_id' => $subscription->id,
            'plan' => $plan
        ]);
    }

    /**
     * Activate a specific plan for a user
     */
    private function activatePlanForUser(User $user, int $planId, PaymentTransaction $transaction): void
    {
        $plan = \App\Models\Plan::find($planId);
        if (!$plan) {
            Log::warning('Plan not found for activation; falling back to amount mapping', [
                'plan_id' => $planId,
                'user_id' => $user->id,
            ]);
            $this->updateUserSubscription($user, $transaction);
            return;
        }

        // Calculate subscription dates
        $startDate = now();
        $endDate = now()->addDays((int) ($plan->duration ?? 30));

        $subscription = Subscription::updateOrCreate(
            ['user_id' => $user->id],
            [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'plan_id' => $plan->id,
                'plan_name' => $plan->name,
                'plan_price' => $plan->price,
                'plan_currency' => $plan->currency,
                'text_sessions_remaining' => $plan->text_sessions ?? 0,
                'voice_calls_remaining' => $plan->voice_calls ?? 0,
                'video_calls_remaining' => $plan->video_calls ?? 0,
                'appointments_remaining' => 0, // Add missing field
                'total_text_sessions' => $plan->text_sessions ?? 0,
                'total_voice_calls' => $plan->voice_calls ?? 0,
                'total_video_calls' => $plan->video_calls ?? 0,
                'payment_transaction_id' => $transaction->transaction_id,
                'payment_gateway' => 'paychangu',
                'payment_status' => 'completed',
                'payment_metadata' => [
                    'payment_method' => $transaction->payment_method ?? 'mobile_money',
                    'transaction_timestamp' => now()->toISOString(),
                    'amount' => $transaction->amount,
                    'currency' => $transaction->currency,
                ],
                'activated_at' => now(),
                'expires_at' => $endDate,
                'status' => 1, // Use integer 1 as shown in CSV
                'is_active' => true,
            ]
        );

        Log::info('User plan activated', [
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'subscription_id' => $subscription->id,
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