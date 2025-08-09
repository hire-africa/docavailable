<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Subscription;
use App\Models\Plan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    public function webhook(Request $request)
    {
        try {
            Log::info('Payment webhook received', ['data' => $request->all()]);
            
            $data = $request->all();
            $meta = $data['meta'] ?? [];
            
            if (!isset($meta['user_id'])) {
                Log::error('Payment webhook missing user_id in meta', ['data' => $data]);
                return response()->json(['error' => 'Missing user_id in meta data'], 400);
            }
            
            if ($data['status'] === 'success') {
                return $this->processSuccessfulPayment($data);
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

    protected function processSuccessfulPayment($data)
    {
        try {
            DB::beginTransaction();
            
            $userId = $data['meta']['user_id'];
            $amount = $data['amount'];
            $currency = $data['currency'];
            
            // Find matching plan by amount and currency
            $plan = Plan::where('price', $amount)
                       ->where('currency', $currency)
                       ->first();
            
            $subscriptionData = [
                'user_id' => $userId,
                'status' => 1, // Active
                'start_date' => now(),
                'end_date' => now()->addDays($plan ? $plan->duration : 30),
                'payment_metadata' => [
                    'transaction_id' => $data['transaction_id'],
                    'reference' => $data['reference'],
                    'amount' => $amount,
                    'currency' => $currency,
                    'payment_method' => $data['payment_method'],
                    'payment_channel' => $data['payment_channel'],
                    'paid_at' => $data['paid_at']
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
                'trace' => $e->getTraceAsString()
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
            // Get table structure for debugging
            $tableInfo = DB::select("
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = 'subscriptions'
                ORDER BY ordinal_position;
            ");
            
            $constraints = DB::select("
                SELECT tc.constraint_name, tc.constraint_type, 
                       kcu.column_name, 
                       ccu.table_name AS foreign_table_name,
                       ccu.column_name AS foreign_column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                  ON tc.constraint_name = kcu.constraint_name
                LEFT JOIN information_schema.constraint_column_usage ccu
                  ON tc.constraint_name = ccu.constraint_name
                WHERE tc.table_name = 'subscriptions';
            ");
            
            // Log the structure info
            Log::info('Subscriptions table structure:', [
                'columns' => $tableInfo,
                'constraints' => $constraints
            ]);
            
            // Create test payment data
            $testData = [
                'transaction_id' => 'TEST_' . time(),
                'reference' => 'TEST_' . time(),
                'amount' => $request->input('amount', 100.00),
                'currency' => $request->input('currency', 'MWK'),
                'status' => 'success',
                'phone_number' => '+265123456789',
                'payment_method' => 'mobile_money',
                'payment_channel' => 'Mobile Money',
                'name' => 'Test User',
                'email' => 'test@example.com',
                'paid_at' => now()->toDateTimeString(),
                'meta' => [
                    'user_id' => $request->input('user_id', 11)
                ]
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