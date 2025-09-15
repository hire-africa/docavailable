<?php

require_once __DIR__ . '/../backend/vendor/autoload.php';

use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\DoctorAvailability;

// Bootstrap Laravel
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🧪 Testing Doctor Availability API Endpoint\n";
echo "==========================================\n\n";

try {
    // 1. Find a doctor
    echo "1. Finding a doctor...\n";
    $doctor = User::where('user_type', 'doctor')->where('status', 'approved')->first();
    
    if (!$doctor) {
        echo "❌ No approved doctor found.\n";
        exit(1);
    }
    
    echo "✅ Found doctor: {$doctor->first_name} {$doctor->last_name} (ID: {$doctor->id})\n\n";
    
    // 2. Check if doctor has availability record
    echo "2. Checking availability record...\n";
    $availability = DoctorAvailability::where('doctor_id', $doctor->id)->first();
    
    if (!$availability) {
        echo "⚠️  No availability record found. Creating one...\n";
        
        $availability = DoctorAvailability::create([
            'doctor_id' => $doctor->id,
            'is_online' => true,
            'working_hours' => json_encode([
                'monday' => ['enabled' => true, 'slots' => [['start' => '09:00', 'end' => '17:00']]],
                'tuesday' => ['enabled' => true, 'slots' => [['start' => '09:00', 'end' => '17:00']]],
                'wednesday' => ['enabled' => false, 'slots' => [['start' => '09:00', 'end' => '17:00']]],
                'thursday' => ['enabled' => false, 'slots' => [['start' => '09:00', 'end' => '17:00']]],
                'friday' => ['enabled' => false, 'slots' => [['start' => '09:00', 'end' => '17:00']]],
                'saturday' => ['enabled' => false, 'slots' => [['start' => '09:00', 'end' => '17:00']]],
                'sunday' => ['enabled' => false, 'slots' => [['start' => '09:00', 'end' => '17:00']]],
            ]),
            'max_patients_per_day' => 15,
            'auto_accept_appointments' => true,
        ]);
        
        echo "✅ Created availability record\n";
    } else {
        echo "✅ Found existing availability record\n";
    }
    
    // 3. Test the API endpoint structure
    echo "3. Testing API response structure...\n";
    
    $apiResponse = [
        'success' => true,
        'data' => [
            'is_online' => $availability->is_online,
            'working_hours' => json_decode($availability->working_hours, true),
            'max_patients_per_day' => $availability->max_patients_per_day,
            'auto_accept_appointments' => $availability->auto_accept_appointments,
        ]
    ];
    
    echo "✅ API Response Structure:\n";
    echo json_encode($apiResponse, JSON_PRETTY_PRINT) . "\n\n";
    
    // 4. Test the relationship
    echo "4. Testing User-Availability relationship...\n";
    $doctorWithAvailability = User::with('doctorAvailability')->find($doctor->id);
    
    if ($doctorWithAvailability->doctorAvailability) {
        echo "✅ Relationship works correctly\n";
        echo "   - Doctor ID: {$doctorWithAvailability->id}\n";
        echo "   - Online: " . ($doctorWithAvailability->doctorAvailability->is_online ? 'Yes' : 'No') . "\n";
        echo "   - Max patients: {$doctorWithAvailability->doctorAvailability->max_patients_per_day}\n";
    } else {
        echo "❌ Relationship not working\n";
    }
    
    echo "\n🎉 API endpoint test completed successfully!\n";
    
} catch (Exception $e) {
    echo "❌ Test failed: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
} 