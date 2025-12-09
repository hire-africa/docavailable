<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "Testing anonymization service...\n";

// Get the patient user (ID 1)
$patient = \App\Models\User::find(1);
if (!$patient) {
    echo "Patient not found\n";
    exit;
}

echo "Patient found: " . $patient->display_name . "\n";
echo "Privacy preferences: " . json_encode($patient->privacy_preferences, JSON_PRETTY_PRINT) . "\n";

// Test anonymization service
$anonymizationService = new \App\Services\AnonymizationService();

echo "\nTesting anonymization service methods:\n";

// Test isAnonymousModeEnabled
$isAnonymous = $anonymizationService->isAnonymousModeEnabled($patient);
echo "isAnonymousModeEnabled: " . ($isAnonymous ? 'true' : 'false') . "\n";

// Test getAnonymizedDisplayName
$anonymizedName = $anonymizationService->getAnonymizedDisplayName($patient);
echo "getAnonymizedDisplayName: " . $anonymizedName . "\n";

// Test getAnonymizedProfilePicture
$anonymizedPicture = $anonymizationService->getAnonymizedProfilePicture($patient);
echo "getAnonymizedProfilePicture: " . $anonymizedPicture . "\n";

// Test getAnonymizedUserData
$anonymizedData = $anonymizationService->getAnonymizedUserData($patient);
echo "getAnonymizedUserData: " . json_encode($anonymizedData, JSON_PRETTY_PRINT) . "\n";
?>

