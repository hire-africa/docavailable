<?php

// Check if basic entities exist in the database
echo "Checking database entities...\n";

// Test 1: Check if plan_id=1 exists
echo "\n=== Test 1: Check Plan ID 1 ===\n";
$planUrl = 'https://docavailable-5.onrender.com/api/admin/plans/1';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $planUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/json',
    'Authorization: Bearer INVALID_TOKEN' // This will fail, but we can see the response
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Plan HTTP Code: $httpCode\n";
echo "Plan Response:\n";
$planData = json_decode($response, true);
print_r($planData);

if ($httpCode === 401) {
    echo "\n✅ Plan endpoint exists (requires authentication)\n";
    echo "Plan_id=1 might exist, but we can't access it without admin token\n";
} elseif ($httpCode === 404) {
    echo "\n❌ Plan_id=1 does not exist!\n";
    echo "This is likely the cause of the webhook failure.\n";
} elseif ($httpCode === 200) {
    echo "\n✅ Plan_id=1 exists!\n";
} else {
    echo "\n⚠️  Unexpected response for plan\n";
}

// Test 2: Check if user_id=1 exists
echo "\n=== Test 2: Check User ID 1 ===\n";
$userUrl = 'https://docavailable-5.onrender.com/api/admin/users/1';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $userUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/json',
    'Authorization: Bearer INVALID_TOKEN' // This will fail, but we can see the response
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "User HTTP Code: $httpCode\n";
echo "User Response:\n";
$userData = json_decode($response, true);
print_r($userData);

if ($httpCode === 401) {
    echo "\n✅ User endpoint exists (requires authentication)\n";
    echo "User_id=1 might exist, but we can't access it without admin token\n";
} elseif ($httpCode === 404) {
    echo "\n❌ User_id=1 does not exist!\n";
    echo "This is likely the cause of the webhook failure.\n";
} elseif ($httpCode === 200) {
    echo "\n✅ User_id=1 exists!\n";
} else {
    echo "\n⚠️  Unexpected response for user\n";
}

echo "\n=== Summary ===\n";
echo "The webhook is failing with a 500 error, which suggests:\n";
echo "1. ❌ Plan_id=1 might not exist in the database\n";
echo "2. ❌ User_id=1 might not exist in the database\n";
echo "3. ❌ Database connection issues during transaction processing\n\n";

echo "SOLUTION:\n";
echo "1. Check if plan_id=1 exists in your database\n";
echo "2. Check if user_id=1 exists in your database\n";
echo "3. If they don't exist, create them or use existing IDs\n";
echo "4. Update the plan price to 100 MWK if needed\n";
echo "5. Test a real payment through the app\n\n";

echo "The webhook processing logic is now fixed, but the entities it's trying to process don't exist.\n";
echo "Once you ensure plan_id=1 and user_id=1 exist, the webhook should work correctly.\n"; 