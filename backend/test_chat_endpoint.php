<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "Testing chat endpoint for session 68...\n";

try {
    // Get user 15 (patient)
    $user = \App\Models\User::find(15);
    if (!$user) {
        echo "❌ User 15 not found\n";
        exit(1);
    }
    
    echo "✅ Using user: " . $user->first_name . " " . $user->last_name . "\n";
    
    // Authenticate the user
    \Illuminate\Support\Facades\Auth::login($user);
    echo "✅ User authenticated\n";
    
    // Create a test request
    $request = new \Illuminate\Http\Request();
    $request->merge([
        'message' => 'Test message from script',
        'message_type' => 'text',
        'temp_id' => 'test_' . time()
    ]);
    
    // Test the ChatController
    $chatController = app(\App\Http\Controllers\ChatController::class);
    echo "✅ ChatController instantiated\n";
    
    // Call sendMessage
    $response = $chatController->sendMessage($request, 'text_session_68');
    
    echo "Response status: " . $response->getStatusCode() . "\n";
    $responseData = json_decode($response->getContent(), true);
    
    if (isset($responseData['success'])) {
        echo "Success: " . ($responseData['success'] ? 'true' : 'false') . "\n";
        if (isset($responseData['message'])) {
            echo "Message: " . $responseData['message'] . "\n";
        }
        if (isset($responseData['data'])) {
            echo "Data: " . json_encode($responseData['data']) . "\n";
        }
    }
    
    if ($response->getStatusCode() === 200) {
        echo "✅ Chat endpoint working locally\n";
    } else {
        echo "❌ Chat endpoint returned status: " . $response->getStatusCode() . "\n";
    }
    
} catch (Exception $e) {
    echo "❌ Exception: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n";
    echo "Line: " . $e->getLine() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
}
