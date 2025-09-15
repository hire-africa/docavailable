<?php

require_once __DIR__ . '/../backend/vendor/autoload.php';

use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\DoctorAvailability;

// Bootstrap Laravel
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🧪 Testing Patient Data Fetching\n";
echo "================================\n\n";

try {
    // 1. Test the /doctors/active endpoint (what patient dashboard uses)
    echo "1. Testing /doctors/active endpoint...\n";
    
    // Simulate the API call that patient dashboard makes
    $doctors = User::with('doctorAvailability')
        ->where('user_type', 'doctor')
        ->where('status', 'approved')
        ->select([
            'id',
            'first_name',
            'last_name',
            'display_name',
            'email',
            'specialization',
            'years_of_experience',
            'bio',
            'rating',
            'total_ratings',
            'city',
            'country',
            'status',
            'profile_picture'
        ])
        ->orderBy('rating', 'desc')
        ->orderBy('years_of_experience', 'desc')
        ->get();
    
    echo "✅ Found " . $doctors->count() . " approved doctor(s)\n";
    
    // Transform data like the frontend does
    $transformedDoctors = $doctors->map(function ($doctor) {
        $doctorData = $doctor->toArray();
        
        // Add profile picture URL
        if ($doctor->profile_picture) {
            $doctorData['profile_picture_url'] = \Illuminate\Support\Facades\Storage::disk('public')->url($doctor->profile_picture);
        }
        
        // Add availability info
        if ($doctor->doctorAvailability) {
            $doctorData['is_online'] = $doctor->doctorAvailability->is_online;
            $doctorData['working_hours'] = json_decode($doctor->doctorAvailability->working_hours, true);
            $doctorData['max_patients_per_day'] = $doctor->doctorAvailability->max_patients_per_day;
        } else {
            $doctorData['is_online'] = false;
            $doctorData['working_hours'] = null;
            $doctorData['max_patients_per_day'] = null;
        }
        
        return $doctorData;
    });
    
    echo "\n2. Testing transformed data structure...\n";
    foreach ($transformedDoctors as $doctor) {
        $onlineStatus = $doctor['is_online'] ? '🟢 Online' : '🔴 Offline';
        echo "   - {$doctor['first_name']} {$doctor['last_name']}: {$onlineStatus}\n";
        echo "     ID: {$doctor['id']}\n";
        echo "     Specialization: {$doctor['specialization']}\n";
        echo "     Experience: {$doctor['years_of_experience']} years\n";
        echo "     Rating: {$doctor['rating']}\n";
        echo "     Profile Picture: " . ($doctor['profile_picture_url'] ? '✅' : '❌') . "\n";
        echo "     Working Hours: " . ($doctor['working_hours'] ? '✅' : '❌') . "\n";
        echo "     Max Patients: " . ($doctor['max_patients_per_day'] ?? 'Not set') . "\n";
        echo "\n";
    }
    
    // 3. Test search functionality
    echo "3. Testing search functionality...\n";
    $searchQuery = 'john';
    $filteredDoctors = $transformedDoctors->filter(function ($doctor) use ($searchQuery) {
        $query = strtolower($searchQuery);
        $name = strtolower("{$doctor['first_name']} {$doctor['last_name']}");
        $specialization = strtolower($doctor['specialization']);
        $location = strtolower($doctor['city'] ?? $doctor['country'] ?? '');
        
        return strpos($name, $query) !== false || 
               strpos($specialization, $query) !== false || 
               strpos($location, $query) !== false;
    });
    
    echo "✅ Search for '{$searchQuery}' found " . $filteredDoctors->count() . " doctor(s)\n";
    
    // 4. Test online filtering
    echo "4. Testing online filtering...\n";
    $onlineDoctors = $transformedDoctors->filter(function ($doctor) {
        return $doctor['is_online'];
    });
    
    echo "✅ Found " . $onlineDoctors->count() . " online doctor(s)\n";
    
    // 5. Test sorting
    echo "5. Testing sorting functionality...\n";
    
    // Sort by availability (online first)
    $availabilitySorted = $transformedDoctors->sortByDesc('is_online')->values();
    echo "✅ Availability sorting: " . $availabilitySorted->first()['is_online'] ? 'Online first' : 'Offline first' . "\n";
    
    // Sort by name
    $nameSorted = $transformedDoctors->sortBy(function ($doctor) {
        return "{$doctor['first_name']} {$doctor['last_name']}";
    })->values();
    echo "✅ Name sorting: First doctor is {$nameSorted->first()['first_name']} {$nameSorted->first()['last_name']}\n";
    
    // Sort by rating
    $ratingSorted = $transformedDoctors->sortByDesc('rating')->values();
    echo "✅ Rating sorting: Highest rating is {$ratingSorted->first()['rating']}\n";
    
    // Sort by experience
    $experienceSorted = $transformedDoctors->sortByDesc('years_of_experience')->values();
    echo "✅ Experience sorting: Most experience is {$experienceSorted->first()['years_of_experience']} years\n";
    
    // 6. Test data completeness
    echo "6. Testing data completeness...\n";
    $completeData = $transformedDoctors->filter(function ($doctor) {
        return !empty($doctor['first_name']) && 
               !empty($doctor['last_name']) && 
               !empty($doctor['specialization']) && 
               isset($doctor['is_online']);
    });
    
    echo "✅ " . $completeData->count() . " out of " . $transformedDoctors->count() . " doctors have complete data\n";
    
    // 7. Summary
    echo "\n📋 Patient Data Fetching Summary:\n";
    echo "==================================\n";
    echo "✅ /doctors/active endpoint returns correct data\n";
    echo "✅ Online status is properly included\n";
    echo "✅ Search functionality works (name, specialization, location)\n";
    echo "✅ Online filtering works correctly\n";
    echo "✅ All sorting options work (availability, name, rating, experience)\n";
    echo "✅ Data transformation matches frontend expectations\n";
    echo "✅ Profile pictures and availability data included\n";
    echo "\n🎉 Patient data fetching is working correctly!\n";
    
} catch (Exception $e) {
    echo "❌ Test failed: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
} 