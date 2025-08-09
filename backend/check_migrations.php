<?php

echo "🔍 Checking migration status in production...\n\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://docavailable-1.onrender.com/api/debug/migrations');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Accept: application/json']);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Status Code: $httpCode\n";
if ($httpCode === 200) {
    $data = json_decode($response, true);
    if (isset($data['migrations'])) {
        echo "✅ Found migrations:\n";
        foreach ($data['migrations'] as $migration) {
            echo "\nMigration: {$migration['migration']}\n";
            echo "Batch: {$migration['batch']}\n";
            echo "Run At: {$migration['created_at']}\n";
            echo str_repeat('-', 30) . "\n";
        }
    } else {
        echo "❌ No migrations found in response\n";
        print_r($data);
    }
} else {
    echo "❌ Failed to fetch migrations\n";
    echo "Response:\n";
    print_r(json_decode($response, true));
}
