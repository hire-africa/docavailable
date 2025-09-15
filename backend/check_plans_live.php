<?php

// Check plans on live backend
echo "Checking plans on live backend...\n";

$url = 'https://docavailable-5.onrender.com/api/plans';

echo "Requesting plans from: $url\n\n";

// Make the request
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/json'
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Status Code: $httpCode\n";
echo "Response:\n";
$responseData = json_decode($response, true);
print_r($responseData);

if ($httpCode === 200 && isset($responseData['data'])) {
    echo "\n✅ Plans retrieved successfully!\n";
    echo "Found " . count($responseData['data']) . " plans:\n";
    
    foreach ($responseData['data'] as $plan) {
        echo "Plan ID: " . $plan['id'] . "\n";
        echo "Name: " . $plan['name'] . "\n";
        echo "Price: " . $plan['price'] . " " . $plan['currency'] . "\n";
        echo "Duration: " . $plan['duration'] . " days\n";
        echo "Text Sessions: " . $plan['text_sessions'] . "\n";
        echo "Voice Calls: " . $plan['voice_calls'] . "\n";
        echo "Video Calls: " . $plan['video_calls'] . "\n";
        echo "Status: " . $plan['status'] . "\n";
        echo "---\n";
    }
    
    // Check if plan_id = 1 exists
    $plan1 = null;
    foreach ($responseData['data'] as $plan) {
        if ($plan['id'] == 1) {
            $plan1 = $plan;
            break;
        }
    }
    
    if ($plan1) {
        echo "✅ Plan ID 1 exists:\n";
        echo "   Name: " . $plan1['name'] . "\n";
        echo "   Price: " . $plan1['price'] . " " . $plan1['currency'] . "\n";
    } else {
        echo "❌ Plan ID 1 does not exist!\n";
    }
    
} else {
    echo "\n❌ Failed to retrieve plans!\n";
} 