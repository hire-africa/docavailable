<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use App\Http\Controllers\Auth\AuthenticationController;

echo "🧪 Testing Email Verification API...\n";
echo "===================================\n\n";

// Test data
$email = 'test@example.com';
$code = '123456';

echo "📧 Test Email: $email\n";
echo "🔑 Test Code: $code\n\n";

// Step 1: First, send a verification code (simulate the send endpoint)
echo "1️⃣ Simulating send verification code...\n";
try {
    $cacheKey = 'email_verification_' . $email;
    Cache::put($cacheKey, $code, now()->addMinutes(10));
    
    $storedCode = Cache::get($cacheKey);
    if ($storedCode === $code) {
        echo "   ✅ Code stored successfully: $storedCode\n\n";
    } else {
        echo "   ❌ Code storage failed\n\n";
        exit(1);
    }
} catch (Exception $e) {
    echo "   ❌ Error storing code: " . $e->getMessage() . "\n\n";
    exit(1);
}

// Step 2: Now test the verification endpoint
echo "2️⃣ Testing verification endpoint...\n";
try {
    // Create a mock request
    $request = new Request();
    $request->merge([
        'email' => $email,
        'code' => $code
    ]);
    
    // Create controller instance
    $controller = new AuthenticationController();
    
    // Call the verifyEmail method
    $response = $controller->verifyEmail($request);
    
    // Get the response data
    $responseData = json_decode($response->getContent(), true);
    $statusCode = $response->getStatusCode();
    
    echo "   📊 Response Status: $statusCode\n";
    echo "   📝 Response Data: " . json_encode($responseData, JSON_PRETTY_PRINT) . "\n\n";
    
    if ($statusCode === 200 && $responseData['success']) {
        echo "   ✅ Verification successful!\n\n";
    } else {
        echo "   ❌ Verification failed!\n\n";
    }
    
} catch (Exception $e) {
    echo "   ❌ Exception during verification: " . $e->getMessage() . "\n";
    echo "   📍 File: " . $e->getFile() . "\n";
    echo "   📍 Line: " . $e->getLine() . "\n";
    echo "   🔍 Trace:\n" . $e->getTraceAsString() . "\n\n";
}

// Step 3: Test with invalid code
echo "3️⃣ Testing with invalid code...\n";
try {
    $request = new Request();
    $request->merge([
        'email' => $email,
        'code' => '000000' // Invalid code
    ]);
    
    $controller = new AuthenticationController();
    $response = $controller->verifyEmail($request);
    
    $responseData = json_decode($response->getContent(), true);
    $statusCode = $response->getStatusCode();
    
    echo "   📊 Response Status: $statusCode\n";
    echo "   📝 Response Data: " . json_encode($responseData, JSON_PRETTY_PRINT) . "\n\n";
    
    if ($statusCode === 400 && !$responseData['success']) {
        echo "   ✅ Invalid code correctly rejected!\n\n";
    } else {
        echo "   ❌ Invalid code was not properly rejected!\n\n";
    }
    
} catch (Exception $e) {
    echo "   ❌ Exception with invalid code: " . $e->getMessage() . "\n\n";
}

// Step 4: Test with missing email
echo "4️⃣ Testing with missing email...\n";
try {
    $request = new Request();
    $request->merge([
        'code' => $code
        // Missing email
    ]);
    
    $controller = new AuthenticationController();
    $response = $controller->verifyEmail($request);
    
    $responseData = json_decode($response->getContent(), true);
    $statusCode = $response->getStatusCode();
    
    echo "   📊 Response Status: $statusCode\n";
    echo "   📝 Response Data: " . json_encode($responseData, JSON_PRETTY_PRINT) . "\n\n";
    
    if ($statusCode === 422 && !$responseData['success']) {
        echo "   ✅ Missing email correctly rejected!\n\n";
    } else {
        echo "   ❌ Missing email was not properly rejected!\n\n";
    }
    
} catch (Exception $e) {
    echo "   ❌ Exception with missing email: " . $e->getMessage() . "\n\n";
}

echo "🧪 API test completed!\n";
