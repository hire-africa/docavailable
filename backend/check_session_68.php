<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "Checking session 68...\n";

try {
    $session = DB::table('text_sessions')->where('id', 68)->first();
    if ($session) {
        echo "✅ Session 68 EXISTS\n";
        echo "Status: " . ($session->status ?? 'unknown') . "\n";
        echo "Patient ID: " . ($session->patient_id ?? 'unknown') . "\n";
        echo "Doctor ID: " . ($session->doctor_id ?? 'unknown') . "\n";
    } else {
        echo "❌ Session 68 NOT FOUND\n";
    }
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
