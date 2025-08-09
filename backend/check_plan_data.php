<?php

echo "🔍 Checking plan data in production...\n\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://docavailable-1.onrender.com/api/plans/all');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Accept: application/json']);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Status Code: $httpCode\n";
if ($httpCode === 200) {
    $data = json_decode($response, true);
    if (isset($data['plans'])) {
        echo "✅ Found plans:\n";
        foreach ($data['plans'] as $plan) {
            echo "\nPlan ID: {$plan['id']}\n";
            echo "Name: {$plan['name']}\n";
            echo "Price: {$plan['price']} {$plan['currency']}\n";
            echo "Text Sessions: {$plan['text_sessions']}\n";
            echo "Voice Calls: {$plan['voice_calls']}\n";
            echo "Video Calls: {$plan['video_calls']}\n";
            echo "Status: " . ($plan['status'] ? 'Active' : 'Inactive') . "\n";
            echo str_repeat('-', 30) . "\n";
        }
    } else {
        echo "❌ No plans found in response\n";
        print_r($data);
    }
} else {
    echo "❌ Failed to fetch plans\n";
    echo "Response:\n";
    print_r(json_decode($response, true));
}
