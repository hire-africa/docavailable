<?php

// Test if plans table has the required fields after migration
echo "🔍 TESTING PLANS TABLE STRUCTURE\n";
echo "===============================\n\n";

// Test 1: Check if we can access the plans endpoint
echo "1. Testing plans endpoint...\n";
$plansUrl = 'https://docavailable-1.onrender.com/api/plans';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $plansUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/json'
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Plans Endpoint HTTP Code: $httpCode\n";
$plansData = json_decode($response, true);

if ($httpCode === 200 && isset($plansData['data'])) {
    echo "✅ Plans endpoint accessible\n";
    $plans = $plansData['data'];
    if (count($plans) > 0) {
        $firstPlan = $plans[0];
        echo "First plan details:\n";
        echo "- ID: " . $firstPlan['id'] . "\n";
        echo "- Name: " . $firstPlan['name'] . "\n";
        echo "- Price: " . $firstPlan['price'] . "\n";
        echo "- Currency: " . $firstPlan['currency'] . "\n";
        
        // Check if the new fields exist
        $hasTextSessions = isset($firstPlan['text_sessions']);
        $hasVoiceCalls = isset($firstPlan['voice_calls']);
        $hasVideoCalls = isset($firstPlan['video_calls']);
        $hasDuration = isset($firstPlan['duration']);
        
        echo "\nNew fields check:\n";
        echo "- text_sessions: " . ($hasTextSessions ? '✅' : '❌') . "\n";
        echo "- voice_calls: " . ($hasVoiceCalls ? '✅' : '❌') . "\n";
        echo "- video_calls: " . ($hasVideoCalls ? '✅' : '❌') . "\n";
        echo "- duration: " . ($hasDuration ? '✅' : '❌') . "\n";
        
        if ($hasTextSessions && $hasVoiceCalls && $hasVideoCalls && $hasDuration) {
            echo "\n🎉 SUCCESS! Plans table has all required fields!\n";
        } else {
            echo "\n❌ Plans table is missing required fields!\n";
        }
    }
} else {
    echo "❌ Plans endpoint not accessible\n";
}

// Test 2: Check specific plan (plan_id=5)
echo "\n2. Testing specific plan (plan_id=5)...\n";
$planUrl = 'https://docavailable-1.onrender.com/api/plans/5';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $planUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/json'
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Plan 5 HTTP Code: $httpCode\n";
$planData = json_decode($response, true);

if ($httpCode === 200 && isset($planData['data'])) {
    $plan = $planData['data'];
    echo "Plan 5 details:\n";
    echo "- ID: " . $plan['id'] . "\n";
    echo "- Name: " . $plan['name'] . "\n";
    echo "- Price: " . $plan['price'] . "\n";
    echo "- Currency: " . $plan['currency'] . "\n";
    
    // Check if the new fields exist
    $hasTextSessions = isset($plan['text_sessions']);
    $hasVoiceCalls = isset($plan['voice_calls']);
    $hasVideoCalls = isset($plan['video_calls']);
    $hasDuration = isset($plan['duration']);
    
    echo "\nNew fields check:\n";
    echo "- text_sessions: " . ($hasTextSessions ? '✅' : '❌') . "\n";
    echo "- voice_calls: " . ($hasVoiceCalls ? '✅' : '❌') . "\n";
    echo "- video_calls: " . ($hasVideoCalls ? '✅' : '❌') . "\n";
    echo "- duration: " . ($hasDuration ? '✅' : '❌') . "\n";
    
    if ($hasTextSessions && $hasVoiceCalls && $hasVideoCalls && $hasDuration) {
        echo "\n🎉 SUCCESS! Plan 5 has all required fields!\n";
    } else {
        echo "\n❌ Plan 5 is missing required fields!\n";
    }
} else {
    echo "❌ Plan 5 not accessible\n";
}

// Analysis
echo "\n" . str_repeat("=", 50) . "\n";
echo "📋 ANALYSIS\n";
echo str_repeat("=", 50) . "\n";

echo "🔍 WHAT THIS MEANS:\n";
echo "1. If plans table has the new fields → Migration was applied ✅\n";
echo "2. If plans table missing fields → Migration not applied ❌\n";
echo "3. If migration not applied → Need to run it manually\n";
echo "4. If migration applied but webhook still fails → Different issue\n\n";

echo "🎯 NEXT STEPS:\n";
echo "1. Check if the plans table has the required fields\n";
echo "2. If not, run the migration manually\n";
echo "3. If yes, the issue is in the webhook processing logic\n";
echo "4. Test the Buy Now button in your app\n"; 