<?php

require_once 'vendor/autoload.php';

use App\Models\User;
use App\Services\AnonymizationService;

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "Testing anonymous mode for patient...\n";

// Find the patient (Praise Mtosa)
$patient = User::where('email', 'zeemtoh99@gmail.com')->first();

if ($patient) {
    echo "Found patient: {$patient->first_name} {$patient->last_name}\n";
    echo "Email: {$patient->email}\n";
    echo "Privacy preferences: " . json_encode($patient->privacy_preferences) . "\n";
    
    $anonymizationService = new AnonymizationService();
    $isAnonymous = $anonymizationService->isAnonymousModeEnabled($patient);
    echo "Is anonymous mode enabled: " . ($isAnonymous ? 'YES' : 'NO') . "\n";
    
    if ($isAnonymous) {
        $anonymizedData = $anonymizationService->getAnonymizedUserData($patient);
        echo "Anonymized data: " . json_encode($anonymizedData) . "\n";
    }
} else {
    echo "Patient not found\n";
}

echo "Done.\n";

