<?php

require_once 'vendor/autoload.php';

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;
use App\Models\User;

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "Testing User API Response...\n\n";

// Find a doctor user with languages_spoken
$doctor = User::where('user_type', 'doctor')
    ->whereNotNull('languages_spoken')
    ->first();

if (!$doctor) {
    echo "No doctor found with languages_spoken. Creating test data...\n";
    
    // Find any doctor and add languages_spoken
    $doctor = User::where('user_type', 'doctor')->first();
    if ($doctor) {
        $doctor->languages_spoken = ['English', 'Chichewa', 'French'];
        $doctor->save();
        echo "Added test languages to doctor ID: {$doctor->id}\n";
    } else {
        echo "No doctors found at all!\n";
        exit;
    }
}

echo "Testing with Doctor ID: {$doctor->id}\n";
echo "Doctor Name: {$doctor->first_name} {$doctor->last_name}\n";
echo "Languages Spoken (raw): " . json_encode($doctor->languages_spoken) . "\n";
echo "Languages Spoken (type): " . gettype($doctor->languages_spoken) . "\n";

// Test the generateImageUrls method using the trait directly
$trait = new class {
    use \App\Traits\HasImageUrls;
    
    public function testGenerateImageUrls($user) {
        return $this->generateImageUrls($user);
    }
};

$userData = $trait->testGenerateImageUrls($doctor);

echo "\nGenerated User Data:\n";
echo "Languages Spoken in response: " . json_encode($userData['languages_spoken'] ?? 'NOT FOUND') . "\n";
echo "Specializations in response: " . json_encode($userData['specializations'] ?? 'NOT FOUND') . "\n";

echo "\nFull user data keys:\n";
foreach (array_keys($userData) as $key) {
    echo "- $key\n";
}

echo "\nAPI Response Structure:\n";
$apiResponse = [
    'success' => true,
    'data' => $userData
];

echo json_encode($apiResponse, JSON_PRETTY_PRINT) . "\n";
