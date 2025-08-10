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
            Log::info('Payment webhook received', ['data' => $request->all()]);
            
            // Log database configuration (without sensitive info)
            Log::info('Database configuration:', [
                'driver' => Config::get('database.default'),
                'host' => Config::get('database.connections.pgsql_simple.host'),
                'database' => Config::get('database.connections.pgsql_simple.database'),
                'port' => Config::get('database.connections.pgsql_simple.port'),
                'sslmode' => Config::get('database.connections.pgsql_simple.sslmode'),
            ]);
            
            $data = $request->all();
            
            // Parse meta data which comes as a JSON string
            $meta = json_decode($data['meta'] ?? '{}', true);
            
            if (empty($meta['user_id'])) {
                Log::error('Payment webhook missing user_id in meta', ['data' => $data]);
                return response()->json(['error' => 'Missing user_id in meta data'], 400);
            }
            
            if ($data['status'] === 'success') {
                return $this->processSuccessfulPayment($data, $meta);
            }
            
            return response()->json(['message' => 'Payment status not success'], 200);
        } catch (\Exception $e) {
            Log::error('Payment webhook error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    protected function processSuccessfulPayment($data, $meta)
    {
        try {
            // Skip database connection test and proceed directly
            Log::info('Starting payment processing');
            
            DB::beginTransaction();
            
            $userId = $meta['user_id'];
            $planId = $meta['plan_id'] ?? null;
            $amount = $data['amount'];
            $currency = $data['currency'];
            
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
            
            $subscriptionData = [
                'user_id' => $userId,
                'status' => 1, // Active
                'start_date' => now(),
                'end_date' => now()->addDays($plan ? $plan->duration : 30),
                'payment_metadata' => [
                    'transaction_id' => $data['tx_ref'],
                    'reference' => $data['reference'],
                    'amount' => $amount,
                    'currency' => $currency,
                    'payment_method' => $data['authorization']['channel'] ?? 'Mobile Money',
                    'payment_channel' => $data['authorization']['mobile_money']['operator'] ?? 'Unknown',
                    'paid_at' => $data['created_at'],
                    'customer' => [
                        'name' => $data['first_name'] . ' ' . $data['last_name'],
                        'email' => $data['email'],
                        'phone' => $data['customer']['phone'] ?? null
                    ]
                ]
            ];
            
            if ($plan) {
                $subscriptionData['plan_id'] = $plan->id;
                $subscriptionData['plan_name'] = $plan->name;
                $subscriptionData['plan_price'] = $plan->price;
                $subscriptionData['plan_currency'] = $plan->currency;
                $subscriptionData['text_sessions'] = $plan->text_sessions;
                $subscriptionData['voice_calls'] = $plan->voice_calls;
                $subscriptionData['video_calls'] = $plan->video_calls;
            }
            
            Log::info('Creating subscription with data:', ['data' => $subscriptionData]);
            
            $subscription = Subscription::updateOrCreate(
                ['user_id' => $userId, 'status' => 1],
                $subscriptionData
            );
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'message' => 'Payment processed successfully',
                'subscription' => $subscription
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
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

    public function testWebhook(Request $request)
    {
        try {
            // Create test payment data in PayChangu format
            $testData = [
                'event_type' => 'checkout.payment',
                'first_name' => 'Test',
                'last_name' => 'User',
                'email' => 'test@example.com',
                'currency' => $request->input('currency', 'MWK'),
                'amount' => $request->input('amount', 100.00),
                'status' => 'success',
                'reference' => 'TEST_' . time(),
                'tx_ref' => 'TEST_TX_' . time(),
                'meta' => json_encode([
                    'user_id' => $request->input('user_id', 11),
                    'plan_id' => $request->input('plan_id')
                ]),
                'customer' => [
                    'phone' => '+265123456789',
                    'email' => 'test@example.com',
                    'first_name' => 'Test',
                    'last_name' => 'User'
                ],
                'authorization' => [
                    'channel' => 'Mobile Money',
                    'mobile_money' => [
                        'operator' => 'Airtel Money',
                        'mobile_number' => '+265123xxxx89'
                    ]
                ],
                'created_at' => now()->toISOString(),
                'updated_at' => now()->toISOString()
            ];
            
            return $this->webhook(new Request($testData));
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