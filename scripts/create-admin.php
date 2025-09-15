<?php

// Configuration
$apiBaseUrl = getenv('EXPO_PUBLIC_API_BASE_URL') ?: 'http://172.20.10.11:8000';

// Admin account details
$adminData = [
    'first_name' => 'Admin',
    'last_name' => 'User',
    'email' => 'admin@docavailable.com',
    'password' => 'admin123456',
    'password_confirmation' => 'admin123456'
];

function createFirstAdmin($apiBaseUrl, $adminData) {
    $url = $apiBaseUrl . '/api/create-first-admin';
    
    echo "Creating first admin account...\n";
    echo "API URL: $url\n";
    echo "Admin data: " . json_encode(array_merge($adminData, ['password' => '***', 'password_confirmation' => '***'])) . "\n\n";
    
    // Prepare the request
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($adminData));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Accept: application/json'
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    
    // Execute the request
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($error) {
        echo "❌ cURL Error: $error\n";
        return;
    }
    
    if ($response === false) {
        echo "❌ Failed to get response\n";
        return;
    }
    
    $data = json_decode($response, true);
    
    if ($httpCode === 201 && isset($data['success']) && $data['success']) {
        echo "✅ Admin account created successfully!\n";
        echo "User ID: " . $data['data']['user']['id'] . "\n";
        echo "Email: " . $data['data']['user']['email'] . "\n";
        echo "Token: " . substr($data['data']['token'], 0, 20) . "...\n";
        echo "\nYou can now login to the admin dashboard with:\n";
        echo "Email: " . $adminData['email'] . "\n";
        echo "Password: " . $adminData['password'] . "\n";
    } else {
        echo "❌ Failed to create admin account\n";
        echo "HTTP Code: $httpCode\n";
        echo "Response: " . $response . "\n";
    }
}

// Run the script
createFirstAdmin($apiBaseUrl, $adminData); 