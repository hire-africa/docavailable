<?php

require_once __DIR__ . '/../backend/vendor/autoload.php';

$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Storage;

echo "Adding sample profile pictures to doctors...\n";
echo "==========================================\n\n";

// Sample profile picture paths (you can add more)
$samplePictures = [
    'profile-pictures/doctor1.jpg',
    'profile-pictures/doctor2.jpg',
    'profile-pictures/doctor3.jpg',
    'profile-pictures/doctor4.jpg',
    'profile-pictures/doctor5.jpg',
];

// Get all doctors without profile pictures
$doctors = User::where('user_type', 'doctor')->get();

echo "Found " . $doctors->count() . " doctors\n";

foreach ($doctors as $index => $doctor) {
    if (!$doctor->profile_picture) {
        // Assign a sample picture (cycling through the array)
        $samplePicture = $samplePictures[$index % count($samplePictures)];
        
        // Check if the sample picture exists
        if (Storage::disk('public')->exists($samplePicture)) {
            $doctor->profile_picture = $samplePicture;
            $doctor->save();
            
            echo "✅ Added profile picture to Dr. {$doctor->first_name} {$doctor->last_name}: {$samplePicture}\n";
        } else {
            echo "⚠️  Sample picture not found: {$samplePicture}\n";
        }
    } else {
        echo "ℹ️  Dr. {$doctor->first_name} {$doctor->last_name} already has profile picture: {$doctor->profile_picture}\n";
    }
}

echo "\n🎉 Profile picture assignment completed!\n";
echo "\nTo test the profile pictures:\n";
echo "1. Make sure you have some sample images in storage/app/public/profile-pictures/\n";
echo "2. The images should be named doctor1.jpg, doctor2.jpg, etc.\n";
echo "3. Restart your app and check the discover page and ended sessions\n"; 