<?php

echo "🔍 FINDING CORRECT PRODUCTION URL\n";
echo "=================================\n\n";

// Possible production URLs to test
$possibleUrls = [
    'https://docavailable-backend.ondigitalocean.app',
    'https://docavailable-1.onrender.com',
    'https://docavailable-backend.ondigitalocean.com',
    'https://docavailable.ondigitalocean.app',
    'https://docavailable-backend.app',
];

$webhookPaths = [
    '/api/payments/webhook',
    '/webhook',
    '/api/webhook'
];

echo "Testing possible production URLs...\n\n";

foreach ($possibleUrls as $baseUrl) {
    echo "Testing: {$baseUrl}\n";
    
    // Test basic connectivity
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'timeout' => 5,
            'ignore_errors' => true
        ]
    ]);
    
    $response = @file_get_contents($baseUrl, false, $context);
    
    if ($response !== false) {
        echo "  ✅ Base URL is accessible\n";
        
        // Test webhook endpoints
        foreach ($webhookPaths as $path) {
            $webhookUrl = $baseUrl . $path;
            echo "  Testing webhook: {$webhookUrl}\n";
            
            $webhookData = [
                'event_type' => 'api.charge.payment',
                'status' => 'success',
                'amount' => 100,
                'currency' => 'MWK',
                'meta' => json_encode(['user_id' => 1, 'plan_id' => 4])
            ];
            
            $context = stream_context_create([
                'http' => [
                    'method' => 'POST',
                    'header' => 'Content-Type: application/json',
                    'content' => json_encode($webhookData),
                    'timeout' => 5,
                    'ignore_errors' => true
                ]
            ]);
            
            $webhookResponse = @file_get_contents($webhookUrl, false, $context);
            
            if ($webhookResponse !== false) {
                echo "    ✅ Webhook endpoint responded\n";
                echo "    Response: " . substr($webhookResponse, 0, 100) . "...\n";
            } else {
                echo "    ❌ Webhook endpoint failed\n";
            }
        }
    } else {
        echo "  ❌ Base URL not accessible\n";
    }
    
    echo "\n";
}

echo "🎉 URL TESTING COMPLETED\n";
echo "========================\n";
echo "If any URLs were found to be accessible, those are your production endpoints.\n";
echo "The webhook should be accessible at: [BASE_URL]/api/payments/webhook\n";
