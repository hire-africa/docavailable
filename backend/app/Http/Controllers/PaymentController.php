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
            
            // Step 2: Parse webhook data
            $data = $request->all();
            Log::info('Webhook payload parsed', ['data' => $data]);
            
            // Step 3: Check event type (Paychangu specific)
            if (!isset($data['event_type'])) {
                Log::error('Missing event_type in webhook payload', ['data' => $data]);
                return response()->json(['error' => 'Missing event_type'], 200);
            }
            // Normalize event type to avoid casing/spacing issues
            $event = strtolower(trim($data['event_type']));
            $allowedEventTypes = ['api.charge.payment', 'checkout.payment'];
            if (!in_array($event, $allowedEventTypes, true)) {
                Log::info('Unsupported event type', ['event_type' => $data['event_type']]);
                return response()->json(['message' => 'Event type not supported'], 200);
            }
            $data['event_type'] = $event;
            
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
                    
                    // Return success response to PayChangu
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
                
                return response()->json(['error' => 'Payment failed'], 400);
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
                Log::warning('Return handler missing tx_ref parameter');
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
            
            // Return a simple HTML page that the WebView can handle
            $html = '<!DOCTYPE html>
<html>
<head>
    <title>Payment Complete</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px; 
            background: #f5f5f5;
        }
        .container { 
            background: white; 
            padding: 30px; 
            border-radius: 10px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            max-width: 400px;
            margin: 0 auto;
        }
        .success { color: #28a745; }
        .error { color: #dc3545; }
        .loading { color: #007bff; }
        .countdown { 
            font-size: 24px; 
            font-weight: bold; 
            margin: 20px 0; 
            color: #007bff;
        }
    </style>
</head>
<body>
    <div class="container">
        <h2 class="' . ($status === 'success' ? 'success' : 'error') . '">
            ' . ($status === 'success' ? 'Payment Successful!' : 'Payment Failed') . '
        </h2>
        <p>Transaction Reference: ' . htmlspecialchars($txRef) . '</p>
        <p>Status: ' . htmlspecialchars($transaction->status) . '</p>
        <div class="countdown" id="countdown">Redirecting in 3 seconds...</div>
        <p>You can close this window and return to the app.</p>
    </div>
    <script>
        console.log("Payment return page loaded", {
            status: "' . $transaction->status . '",
            tx_ref: "' . $txRef . '",
            hasWebView: !!window.ReactNativeWebView
        });
        
        // Countdown and redirect
        let count = 3;
        const countdownEl = document.getElementById("countdown");
        let redirected = false;
        
        // Function to handle redirect
        function performRedirect() {
            if (redirected) {
                console.log("Already redirected, skipping");
                return;
            }
            redirected = true;
            
            console.log("Performing redirect...");
            countdownEl.textContent = "Redirecting now...";
            
            // Send close window message to WebView
            if (window.ReactNativeWebView) {
                console.log("Sending close_window message to WebView");
                try {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: "close_window",
                        status: "' . $transaction->status . '",
                        tx_ref: "' . $txRef . '"
                    }));
                    console.log("Message sent successfully");
                } catch (error) {
                    console.error("Error sending message to WebView:", error);
                }
            } else {
                console.log("ReactNativeWebView not available");
            }
            
            // Fallback: try to go back in history after a short delay
            setTimeout(() => {
                console.log("Executing fallback redirect");
                if (window.history.length > 1) {
                    console.log("Going back in history");
                    window.history.back();
                } else {
                    console.log("Attempting to close window");
                    window.close();
                }
            }, 500);
        }
        
        // Countdown with proper display of 0
        const countdown = setInterval(() => {
            count--;
            console.log("Countdown:", count);
            
            if (count >= 0) {
                countdownEl.textContent = "Redirecting in " + count + " second" + (count !== 1 ? "s" : "") + "...";
            }
            
            if (count <= 0) {
                clearInterval(countdown);
                console.log("Countdown complete, redirecting");
                performRedirect();
            }
        }, 1000);
        
        // Send immediate notification that payment is complete
        if (window.ReactNativeWebView) {
            console.log("Sending payment_status message");
            try {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: "payment_status",
                    status: "' . $transaction->status . '",
                    tx_ref: "' . $txRef . '"
                }));
                console.log("Payment status message sent");
            } catch (error) {
                console.error("Error sending payment_status:", error);
            }
        }
        
        // Additional fallback: Force redirect after 5 seconds no matter what
        setTimeout(() => {
            if (!redirected) {
                console.log("Emergency fallback redirect triggered");
                performRedirect();
            }
        }, 5000);
    </script>
</body>
</html>';
            
            return response($html)->header('Content-Type', 'text/html');
            
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

    /**
     * Activate plan for user after successful payment
     */
    protected function activatePlanForUser($userId, $planId, $transactionId)
    {
        try {
            $plan = Plan::findOrFail($planId);
            $user = User::findOrFail($userId);
            
            Log::info('Activating plan for user', [
                'user_id' => $userId,
                'plan_id' => $planId,
                'transaction_id' => $transactionId
            ]);
            
            // Check for existing active subscription
            $existingSubscription = Subscription::where('user_id', $userId)
                ->where('is_active', true)
                ->first();
                
            if ($existingSubscription) {
                // Update existing subscription with new sessions
                $subscriptionData = [
                    'plan_id' => $planId,
                    'plan_name' => $plan->name,
                    'plan_price' => $plan->price,
                    'plan_currency' => $plan->currency,
                    'text_sessions_remaining' => $existingSubscription->text_sessions_remaining + $plan->text_sessions,
                    'voice_calls_remaining' => $existingSubscription->voice_calls_remaining + $plan->voice_calls,
                    'video_calls_remaining' => $existingSubscription->video_calls_remaining + $plan->video_calls,
                    'total_text_sessions' => $existingSubscription->total_text_sessions + $plan->text_sessions,
                    'total_voice_calls' => $existingSubscription->total_voice_calls + $plan->voice_calls,
                    'total_video_calls' => $existingSubscription->total_video_calls + $plan->video_calls,
                    'end_date' => now()->addDays($plan->duration),
                    'payment_transaction_id' => $transactionId,
                    'payment_status' => 'completed',
                    'is_active' => true,
                    'activated_at' => now()
                ];
                
                $existingSubscription->update($subscriptionData);
                
                Log::info('Updated existing subscription', [
                    'subscription_id' => $existingSubscription->id,
                    'user_id' => $userId,
                    'plan_id' => $planId
                ]);
                
                return $existingSubscription;
            } else {
                // Create new subscription - Handle potential constraint issues
                $subscriptionData = [
                    'user_id' => $userId,
                    'plan_id' => $planId,
                    'plan_name' => $plan->name,
                    'plan_price' => $plan->price,
                    'plan_currency' => $plan->currency,
                    'status' => 1, // Use integer 1 for active status
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
                
                // First, deactivate any existing inactive subscriptions for this user
                Subscription::where('user_id', $userId)
                    ->where('is_active', false)
                    ->update(['is_active' => false]);
                
                // Try to create the subscription
                try {
                    $subscription = Subscription::create($subscriptionData);
                    
                    Log::info('Created new subscription', [
                        'subscription_id' => $subscription->id,
                        'user_id' => $userId,
                        'plan_id' => $planId
                    ]);
                    
                    return $subscription;
                } catch (\Illuminate\Database\QueryException $e) {
                    // Handle potential unique constraint violations
                    if (strpos($e->getMessage(), 'duplicate key') !== false || 
                        strpos($e->getMessage(), 'unique constraint') !== false ||
                        strpos($e->getMessage(), 'UNIQUE constraint') !== false) {
                        
                        Log::warning('Unique constraint violation, attempting to find existing subscription', [
                            'user_id' => $userId,
                            'plan_id' => $planId,
                            'error' => $e->getMessage()
                        ]);
                        
                        // Try to find and update existing subscription
                        $existingSubscription = Subscription::where('user_id', $userId)
                            ->where('plan_id', $planId)
                            ->first();
                            
                        if ($existingSubscription) {
                            $existingSubscription->update($subscriptionData);
                            
                            Log::info('Updated existing subscription after constraint violation', [
                                'subscription_id' => $existingSubscription->id,
                                'user_id' => $userId,
                                'plan_id' => $planId
                            ]);
                            
                            return $existingSubscription;
                        }
                    }
                    
                    // Re-throw if it's not a constraint issue
                    throw $e;
                }
            }
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