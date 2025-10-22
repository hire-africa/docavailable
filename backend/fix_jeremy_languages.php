<?php

require_once 'vendor/autoload.php';

use Illuminate\Foundation\Application;
use App\Models\User;

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "Fixing Jeremy Lynch's profile...\n";

$jeremy = User::where('email', 'blacksleeky84@gmail.com')->first();
if ($jeremy) {
    echo "Found Jeremy: " . $jeremy->first_name . " " . $jeremy->last_name . "\n";
    echo "Current languages_spoken: " . json_encode($jeremy->languages_spoken) . "\n";
    echo "Current specializations: " . json_encode($jeremy->specializations) . "\n";
    
    // Add languages and specializations
    $jeremy->languages_spoken = ['English', 'Chichewa', 'French'];
    $jeremy->specializations = ['Cardiology', 'Internal Medicine', 'Preventive Care'];
    $jeremy->save();
    
    echo "Updated languages_spoken: " . json_encode($jeremy->languages_spoken) . "\n";
    echo "Updated specializations: " . json_encode($jeremy->specializations) . "\n";
    echo "Profile updated successfully!\n";
} else {
    echo "Jeremy not found!\n";
}
