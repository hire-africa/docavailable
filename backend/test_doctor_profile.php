<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;
use App\Models\DoctorAvailability;
use Illuminate\Support\Facades\DB;

echo "🧪 Testing Doctor Profile Endpoint\n";
echo "==================================\n\n";

try {
    // Test 1: Check if we can connect to the database
    echo "1. Testing database connection...\n";
    $dbConnection = DB::connection()->getPdo();
    echo "   ✅ Database connected successfully\n";
    echo "   Database: " . DB::connection()->getDatabaseName() . "\n\n";

    // Test 2: Check if there are any doctors in the database
    echo "2. Checking for doctors in database...\n";
    $doctors = User::where('user_type', 'doctor')->get();
    echo "   Found " . $doctors->count() . " doctors in database\n";
    
    if ($doctors->count() > 0) {
        $firstDoctor = $doctors->first();
        echo "   First doctor ID: " . $firstDoctor->id . "\n";
        echo "   First doctor name: " . $firstDoctor->first_name . " " . $firstDoctor->last_name . "\n";
        echo "   First doctor status: " . $firstDoctor->status . "\n";
        echo "   First doctor profile_picture: " . ($firstDoctor->profile_picture ?: 'null') . "\n";
        
        // Test 3: Test the profile_picture_url accessor
        echo "\n3. Testing profile_picture_url accessor...\n";
        try {
            $profileUrl = $firstDoctor->profile_picture_url;
            echo "   ✅ profile_picture_url: " . ($profileUrl ?: 'null') . "\n";
        } catch (Exception $e) {
            echo "   ❌ Error getting profile_picture_url: " . $e->getMessage() . "\n";
        }
        
        // Test 4: Check DoctorAvailability table
        echo "\n4. Checking DoctorAvailability table...\n";
        $availability = DoctorAvailability::where('doctor_id', $firstDoctor->id)->first();
        if ($availability) {
            echo "   ✅ Found availability record for doctor " . $firstDoctor->id . "\n";
            echo "   Is online: " . ($availability->is_online ? 'Yes' : 'No') . "\n";
        } else {
            echo "   ⚠️  No availability record found for doctor " . $firstDoctor->id . "\n";
        }
        
        // Test 5: Test the full getDoctorDetails logic
        echo "\n5. Testing getDoctorDetails logic...\n";
        try {
            $doctor = User::where('user_type', 'doctor')
                ->where('status', 'approved')
                ->where('id', $firstDoctor->id)
                ->select([
                    'id',
                    'first_name',
                    'last_name',
                    'display_name',
                    'specialization',
                    'sub_specialization',
                    'specializations',
                    'sub_specializations',
                    'years_of_experience',
                    'bio',
                    'country',
                    'city',
                    'rating',
                    'total_ratings',
                    'created_at',
                    'profile_picture'
                ])
                ->first();
                
            if ($doctor) {
                echo "   ✅ Doctor query successful\n";
                
                // Get doctor availability to check online status
                $availability = DoctorAvailability::where('doctor_id', $firstDoctor->id)->first();
                $isOnline = $availability ? $availability->is_online : false;
                echo "   Is online: " . ($isOnline ? 'Yes' : 'No') . "\n";

                // Add profile picture URL and online status
                $doctorData = $doctor->toArray();
                if ($doctor->profile_picture) {
                    $doctorData['profile_picture_url'] = $doctor->profile_picture_url;
                    echo "   Profile picture URL: " . $doctorData['profile_picture_url'] . "\n";
                }
                $doctorData['is_online'] = $isOnline;
                
                echo "   ✅ Doctor data processing successful\n";
            } else {
                echo "   ❌ Doctor not found or not approved\n";
            }
        } catch (Exception $e) {
            echo "   ❌ Error in getDoctorDetails logic: " . $e->getMessage() . "\n";
            echo "   Stack trace: " . $e->getTraceAsString() . "\n";
        }
        
    } else {
        echo "   ❌ No doctors found in database\n";
    }
    
    // Test 6: Check for any approved doctors specifically
    echo "\n6. Checking for approved doctors...\n";
    $approvedDoctors = User::where('user_type', 'doctor')
        ->where('status', 'approved')
        ->get();
    echo "   Found " . $approvedDoctors->count() . " approved doctors\n";
    
    if ($approvedDoctors->count() > 0) {
        $approvedDoctor = $approvedDoctors->first();
        echo "   Approved doctor ID: " . $approvedDoctor->id . "\n";
        echo "   Approved doctor name: " . $approvedDoctor->first_name . " " . $approvedDoctor->last_name . "\n";
    } else {
        echo "   ⚠️  No approved doctors found - this might be the issue!\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
}

echo "\n🏁 Test completed\n";
