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
            
            // Verify webhook signature for security
            $signature = $request->header('signature');
            $webhookSecret = config('services.paychangu.webhook_secret');
            
            if ($signature && $webhookSecret) {
                $payload = $request->getContent();
                $expectedSignature = hash_hmac('sha256', $payload, $webhookSecret);
                
                if (!hash_equals($expectedSignature, $signature)) {
                    Log::error('Invalid webhook signature', [
                        'received' => $signature,
                        'expected' => $expectedSignature
                    ]);
                    return response()->json(['error' => 'Invalid signature'], 401);
                }
            }
            
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
            
            // Enhanced validation with detailed error reporting
            $requiredFields = ['user_id'];
            $missingFields = [];
            
            foreach ($requiredFields as $field) {
                if (empty($meta[$field])) {
                    $missingFields[] = "meta.{$field}";
                }
            }
            
            if (!empty($missingFields)) {
                Log::error('Payment webhook missing required fields', [
                    'missing_fields' => $missingFields,
                    'meta_data' => $meta,
                    'full_data' => $data
                ]);
                return response()->json([
                    'error' => 'Missing required fields',
                    'missing_fields' => $missingFields
                ], 400);
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
            // Try to use direct database connection
            Log::info('Starting payment processing');
            
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
            
            // Use the same pattern as UserController - no transaction management
            $subscription = Subscription::updateOrCreate(
                ['user_id' => $userId, 'status' => 1],
                $subscriptionData
            );
            
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

    public function debugConfig()
    {
        try {
            return response()->json([
                'success' => true,
                'debug_info' => [
                    'db_connection' => env('DB_CONNECTION'),
                    'db_host' => env('DB_HOST'),
                    'db_port' => env('DB_PORT'),
                    'db_database' => env('DB_DATABASE'),
                    'db_username' => env('DB_USERNAME'),
                    'db_url_set' => !empty(env('DB_URL')),
                    'app_env' => env('APP_ENV'),
                    'app_debug' => env('APP_DEBUG'),
                    'default_connection' => config('database.default'),
                    'available_connections' => array_keys(config('database.connections')),
                    'pgsql_simple_host' => config('database.connections.pgsql_simple.host'),
                    'pgsql_host' => config('database.connections.pgsql.host'),
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }
}