<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Subscription;
use App\Models\Plan;
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
            $signature = $request->header('Signature');
            $webhookSecret = config('services.paychangu.webhook_secret');
            
            Log::info('Webhook verification details', [
                'has_signature' => !empty($signature),
                'has_webhook_secret' => !empty($webhookSecret),
                'payload_length' => strlen($payload)
            ]);
            
            if (!$signature || !$webhookSecret) {
                Log::error('Missing signature or webhook secret', [
                    'signature' => !empty($signature),
                    'webhook_secret' => !empty($webhookSecret)
                ]);
                return response()->json(['error' => 'Unauthorized - missing signature or secret'], 200);
            }
            
            $computedSignature = hash_hmac('sha256', $payload, $webhookSecret);
            
            if (!hash_equals($computedSignature, $signature)) {
                Log::error('Invalid webhook signature', [
                    'computed' => $computedSignature,
                    'received' => $signature
                ]);
                return response()->json(['error' => 'Invalid signature'], 200);
            }
            
            Log::info('Webhook signature verified successfully');
            
            // Step 2: Parse webhook data
            $data = $request->all();
            Log::info('Webhook payload parsed', ['data' => $data]);
            
            // Step 3: Check event type (Paychangu specific)
            if (!isset($data['event_type'])) {
                Log::error('Missing event_type in webhook payload', ['data' => $data]);
                return response()->json(['error' => 'Missing event_type'], 200);
            }
            
            if ($data['event_type'] !== 'api.charge.payment') {
                Log::info('Unsupported event type', ['event_type' => $data['event_type']]);
                return response()->json(['message' => 'Event type not supported'], 200);
            }
            
            // Step 4: Parse meta data (Paychangu sends this as JSON string)
            $meta = [];
            if (isset($data['meta'])) {
                if (is_string($data['meta'])) {
                    $meta = json_decode($data['meta'], true) ?: [];
                } elseif (is_array($data['meta'])) {
                    $meta = $data['meta'];
                }
            }
            
            Log::info('Parsed meta data', ['meta' => $meta]);
            
            if (empty($meta['user_id'])) {
                Log::error('Payment webhook missing user_id in meta', ['data' => $data, 'meta' => $meta]);
                return response()->json(['error' => 'Missing user_id in meta data'], 200);
            }
            
            // Step 5: Check payment status
            if ($data['status'] === 'success') {
                // Step 6: ALWAYS RE-QUERY - Verify with PayChangu API before processing
                $transactionId = $data['charge_id'] ?? $data['reference'] ?? null;
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
            
            // Use correct Paychangu transaction ID fields
            $transactionId = $data['charge_id'] ?? $data['reference'] ?? null;
            
            if (!$transactionId) {
                Log::error('Missing transaction ID in Paychangu webhook', ['data' => $data]);
                throw new \Exception('Missing transaction ID');
            }
            
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
            
            // Check if user already has an active subscription
            $existingSubscription = Subscription::where('user_id', $userId)
                ->where('status', 1)
                ->first();
            
            if ($existingSubscription) {
                // Update existing subscription with new sessions
                $subscriptionData = [
                    'text_sessions_remaining' => $existingSubscription->text_sessions_remaining + ($plan ? $plan->text_sessions : 0),
                    'voice_calls_remaining' => $existingSubscription->voice_calls_remaining + ($plan ? $plan->voice_calls : 0),
                    'video_calls_remaining' => $existingSubscription->video_calls_remaining + ($plan ? $plan->video_calls : 0),
                    'total_text_sessions' => $existingSubscription->total_text_sessions + ($plan ? $plan->text_sessions : 0),
                    'total_voice_calls' => $existingSubscription->total_voice_calls + ($plan ? $plan->voice_calls : 0),
                    'total_video_calls' => $existingSubscription->total_video_calls + ($plan ? $plan->video_calls : 0),
                    'end_date' => now()->addDays($plan ? $plan->duration : 30),
                    'payment_metadata' => $paymentMetadata,
                    'is_active' => true
                ];
                
                if ($plan) {
                    $subscriptionData['plan_id'] = $plan->id;
                    $subscriptionData['plan_name'] = $plan->name;
                    $subscriptionData['plan_price'] = $plan->price;
                    $subscriptionData['plan_currency'] = $plan->currency;
                }
                
                $existingSubscription->update($subscriptionData);
                $subscription = $existingSubscription;
                
                Log::info('Updated existing subscription', [
                    'subscription_id' => $subscription->id,
                    'transaction_id' => $transactionId
                ]);
            } else {
                // Create new subscription
                $subscriptionData = [
                    'user_id' => $userId,
                    'status' => 1, // Active
                    'start_date' => now(),
                    'end_date' => now()->addDays($plan ? $plan->duration : 30),
                    'payment_metadata' => $paymentMetadata,
                    'is_active' => true,
                    'activated_at' => now()
                ];
                
                if ($plan) {
                    $subscriptionData['plan_id'] = $plan->id;
                    $subscriptionData['plan_name'] = $plan->name;
                    $subscriptionData['plan_price'] = $plan->price;
                    $subscriptionData['plan_currency'] = $plan->currency;
                    $subscriptionData['text_sessions_remaining'] = $plan->text_sessions;
                    $subscriptionData['voice_calls_remaining'] = $plan->voice_calls;
                    $subscriptionData['video_calls_remaining'] = $plan->video_calls;
                    $subscriptionData['total_text_sessions'] = $plan->text_sessions;
                    $subscriptionData['total_voice_calls'] = $plan->voice_calls;
                    $subscriptionData['total_video_calls'] = $plan->video_calls;
                }
                
                Log::info('Creating new subscription with data:', ['data' => $subscriptionData]);
                
                $subscription = Subscription::create($subscriptionData);
                
                Log::info('Created new subscription', [
                    'subscription_id' => $subscription->id,
                    'transaction_id' => $transactionId
                ]);
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
            
            // Create transaction record
            $transaction = \App\Models\PaymentTransaction::create([
                'transaction_id' => 'TXN_' . time() . '_' . $user->id,
                'user_id' => $user->id,
                'amount' => $amount,
                'currency' => $currency,
                'gateway' => 'paychangu',
                'status' => 'pending',
                'reference' => 'TXN_' . time() . '_' . $user->id,
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
            if (!$txRef) {
                return response()->json(['error' => 'Missing tx_ref parameter'], 400);
            }
            
            // Find transaction
            $transaction = \App\Models\PaymentTransaction::where('reference', $txRef)
                ->orWhere('gateway_reference', $txRef)
                ->first();
                
            if (!$transaction) {
                Log::error('Transaction not found for callback', ['tx_ref' => $txRef]);
                return response()->json(['error' => 'Transaction not found'], 404);
            }
            
            // Verify payment with PayChangu
            $payChanguService = new \App\Services\PayChanguService();
            $verification = $payChanguService->verify($txRef);
            
            if ($verification['status'] === 'success') {
                $transaction->update([
                    'status' => 'completed',
                    'metadata' => array_merge($transaction->metadata ?? [], [
                        'verification_response' => $verification,
                        'completed_at' => now()->toISOString()
                    ])
                ]);
                
                // Process the successful payment
                $meta = json_decode($verification['meta'] ?? '{}', true);
                return $this->processSuccessfulPayment($verification, $meta);
            } else {
                $transaction->update([
                    'status' => 'failed',
                    'metadata' => array_merge($transaction->metadata ?? [], [
                        'verification_response' => $verification,
                        'failed_at' => now()->toISOString()
                    ])
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Payment verification failed',
                    'status' => $verification['status']
                ], 400);
            }
            
        } catch (\Exception $e) {
            Log::error('PayChangu callback error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function returnHandler(Request $request)
    {
        try {
            Log::info('PayChangu return handler received', ['data' => $request->all()]);
            
            $txRef = $request->query('tx_ref');
            $status = $request->query('status');
            
            if (!$txRef) {
                return response()->json(['error' => 'Missing tx_ref parameter'], 400);
            }
            
            // Find transaction
            $transaction = \App\Models\PaymentTransaction::where('reference', $txRef)
                ->orWhere('gateway_reference', $txRef)
                ->first();
                
            if (!$transaction) {
                Log::error('Transaction not found for return handler', ['tx_ref' => $txRef]);
                return response()->json(['error' => 'Transaction not found'], 404);
            }
            
            // Update transaction status based on return status
            if ($status === 'success') {
                $transaction->update(['status' => 'completed']);
            } else {
                $transaction->update(['status' => 'failed']);
            }
            
            return response()->json([
                'success' => true,
                'message' => 'Return handler processed',
                'transaction_id' => $transaction->id,
                'status' => $transaction->status
            ]);
            
        } catch (\Exception $e) {
            Log::error('PayChangu return handler error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
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
            
            // Verify payment with PayChangu
            $payChanguService = new \App\Services\PayChanguService();
            $verification = $payChanguService->verify($txRef);
            
            if (!$verification['ok']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Payment verification failed',
                    'error' => $verification['error'] ?? 'Unknown error'
                ], 400);
            }
            
            $data = $verification['data'];
            
            // Verify critical fields as per PayChangu documentation
            if (!$data || !isset($data['status'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid verification response'
                ], 400);
            }
            
            // Check if payment is successful
            if ($data['status'] === 'success') {
                // Find our transaction record
                $transaction = \App\Models\PaymentTransaction::where('reference', $txRef)
                    ->orWhere('gateway_reference', $txRef)
                    ->first();
                
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
                        'amount' => $data['amount'],
                        'currency' => $data['currency'],
                        'tx_ref' => $data['tx_ref'],
                        'reference' => $data['reference'],
                        'transaction_id' => $transaction->id ?? null
                    ]
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Payment not successful',
                    'data' => [
                        'status' => $data['status'],
                        'tx_ref' => $data['tx_ref'] ?? $txRef
                    ]
                ], 400);
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
}