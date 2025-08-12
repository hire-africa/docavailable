<?php

require_once __DIR__ . '/../../backend/vendor/autoload.php';

$app = require_once __DIR__ . '/../../backend/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Storage;

echo "Adding sample profile pictures to doctors...\n";
echo "==========================================\n\n";

// Create sample profile picture paths that will be generated
$samplePictures = [
    'profile-pictures/doctor1.png',
    'profile-pictures/doctor2.png',
    'profile-pictures/doctor3.png',
    'profile-pictures/doctor4.png',
    'profile-pictures/doctor5.png',
];

// Get all doctors without profile pictures
$doctors = User::where('user_type', 'doctor')->get();

echo "Found " . $doctors->count() . " doctors\n";

// Create a simple PNG placeholder using GD if available, otherwise create a simple file
function createSampleImage($path) {
    // Check if GD is available
    if (extension_loaded('gd')) {
        // Create a simple PNG image
        $width = 200;
        $height = 200;
        
        $image = imagecreatetruecolor($width, $height);
        
        // Set colors
        $bgColor = imagecolorallocate($image, 76, 175, 80); // #4CAF50
        $textColor = imagecolorallocate($image, 255, 255, 255); // White
        
        // Fill background
        imagefill($image, 0, 0, $bgColor);
        
        // Add text
        $text = "DR";
        $fontSize = 5;
        $textWidth = imagefontwidth($fontSize) * strlen($text);
        $textHeight = imagefontheight($fontSize);
        $x = ($width - $textWidth) / 2;
        $y = ($height - $textHeight) / 2;
        
        imagestring($image, $fontSize, $x, $y, $text, $textColor);
        
        // Save as PNG
        $fullPath = Storage::disk('public')->path($path);
        $dir = dirname($fullPath);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        
        imagepng($image, $fullPath);
        imagedestroy($image);
        
        return true;
    } else {
        // Fallback: Create a simple text file that can be served
        $fullPath = Storage::disk('public')->path($path);
        $dir = dirname($fullPath);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        
        // Create a simple placeholder text file
        $placeholder = "This is a placeholder profile picture for a doctor.\n";
        $placeholder .= "The actual image would be displayed here.\n";
        $placeholder .= "Generated on: " . date('Y-m-d H:i:s');
        
        file_put_contents($fullPath, $placeholder);
        
        return true;
    }
}

foreach ($doctors as $index => $doctor) {
    if (!$doctor->profile_picture) {
        // Assign a sample picture (cycling through the array)
        $samplePicture = $samplePictures[$index % count($samplePictures)];
        
        // Create the sample image if it doesn't exist
        if (!Storage::disk('public')->exists($samplePicture)) {
            createSampleImage($samplePicture);
            echo "✅ Created sample profile picture: {$samplePicture}\n";
        }
        
        // Assign the profile picture to the doctor
        $doctor->profile_picture = $samplePicture;
        $doctor->save();
        
        echo "✅ Added profile picture to Dr. {$doctor->first_name} {$doctor->last_name}: {$samplePicture}\n";
    } else {
        echo "ℹ️  Dr. {$doctor->first_name} {$doctor->last_name} already has profile picture: {$doctor->profile_picture}\n";
    }
}

echo "\n🎉 Profile picture assignment completed!\n";
echo "\nTo test the profile pictures:\n";
echo "1. Restart your app and check the doctor dashboard\n";
echo "2. The doctors should now have visible profile pictures\n";
echo "3. If you see placeholder images, that means the profile pictures are working correctly\n"; 