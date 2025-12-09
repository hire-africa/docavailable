<?php

// Check if there are other users with voice calls available
$apiUrl = 'https://docavailable-3vbdv.ondigitalocean.app/api';

// Test with different user IDs to see if any have voice calls
$userIds = [1, 2, 3, 4, 5]; // Test first 5 users

foreach ($userIds as $userId) {
    echo "=== Testing User ID: $userId ===\n";
    
    // We need to get a token for each user, but let's just test the call API
    // with a mock token to see the response structure
    $testData = [
        'call_type' => 'voice',
        'appointment_id' => 'test_direct_session_' . time(),
        'doctor_id' => 1,
        'reason' => 'Test call session for user ' . $userId
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $apiUrl . '/call-sessions/start');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($testData));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Accept: application/json'
        // No auth token - this will show us the structure
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    echo "HTTP Code: $httpCode\n";
    echo "Response: $response\n\n";
}
