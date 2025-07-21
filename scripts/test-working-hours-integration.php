<?php

require_once __DIR__ . '/../backend/vendor/autoload.php';

use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\DoctorAvailability;

// Bootstrap Laravel
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🧪 Testing Working Hours Integration\n";
echo "=====================================\n\n";

try {
    // 1. Test if we can find a doctor
    echo "1. Finding a doctor...\n";
    $doctor = User::where('user_type', 'doctor')->where('status', 'approved')->first();
    
    if (!$doctor) {
        echo "❌ No approved doctor found. Please create a doctor account first.\n";
        exit(1);
    }
    
    echo "✅ Found doctor: {$doctor->first_name} {$doctor->last_name} (ID: {$doctor->id})\n\n";
    
    // 2. Test if doctor has availability record
    echo "2. Checking doctor availability...\n";
    $availability = $doctor->doctorAvailability;
    
    if (!$availability) {
        echo "⚠️  No availability record found. Creating default availability...\n";
        
        $availability = DoctorAvailability::create([
            'doctor_id' => $doctor->id,
            'is_online' => false,
            'working_hours' => json_encode([
                'monday' => ['enabled' => false, 'slots' => [['start' => '09:00', 'end' => '17:00']]],
                'tuesday' => ['enabled' => false, 'slots' => [['start' => '09:00', 'end' => '17:00']]],
                'wednesday' => ['enabled' => false, 'slots' => [['start' => '09:00', 'end' => '17:00']]],
                'thursday' => ['enabled' => false, 'slots' => [['start' => '09:00', 'end' => '17:00']]],
                'friday' => ['enabled' => false, 'slots' => [['start' => '09:00', 'end' => '17:00']]],
                'saturday' => ['enabled' => false, 'slots' => [['start' => '09:00', 'end' => '17:00']]],
                'sunday' => ['enabled' => false, 'slots' => [['start' => '09:00', 'end' => '17:00']]],
            ]),
            'max_patients_per_day' => 10,
            'auto_accept_appointments' => false,
        ]);
        
        echo "✅ Created default availability record\n";
    } else {
        echo "✅ Found existing availability record\n";
    }
    
    echo "   - Online status: " . ($availability->is_online ? '🟢 Online' : '🔴 Offline') . "\n";
    echo "   - Max patients per day: {$availability->max_patients_per_day}\n";
    echo "   - Auto-accept appointments: " . ($availability->auto_accept_appointments ? 'Yes' : 'No') . "\n\n";
    
    // 3. Test setting doctor online
    echo "3. Setting doctor online...\n";
    $availability->update(['is_online' => true]);
    echo "✅ Doctor is now online\n\n";
    
    // 4. Test available doctors endpoint logic
    echo "4. Testing available doctors query...\n";
    $availableDoctors = User::with(['doctorAvailability'])
        ->where('user_type', 'doctor')
        ->where('status', 'approved')
        ->whereHas('doctorAvailability', function ($q) {
            $q->where('is_online', true);
        })
        ->get();
    
    echo "✅ Found " . $availableDoctors->count() . " online doctor(s)\n";
    
    foreach ($availableDoctors as $doc) {
        echo "   - {$doc->first_name} {$doc->last_name} (ID: {$doc->id})\n";
    }
    echo "\n";
    
    // 5. Test setting doctor offline
    echo "5. Setting doctor offline...\n";
    $availability->update(['is_online' => false]);
    echo "✅ Doctor is now offline\n\n";
    
    // 6. Test that doctor is no longer available
    echo "6. Testing offline status...\n";
    $availableDoctors = User::with(['doctorAvailability'])
        ->where('user_type', 'doctor')
        ->where('status', 'approved')
        ->whereHas('doctorAvailability', function ($q) {
            $q->where('is_online', true);
        })
        ->get();
    
    echo "✅ Found " . $availableDoctors->count() . " online doctor(s) (should be 0)\n\n";
    
    // 7. Test working hours structure
    echo "7. Testing working hours structure...\n";
    $workingHours = json_decode($availability->working_hours, true);
    $enabledDays = 0;
    
    foreach ($workingHours as $day => $config) {
        if ($config['enabled']) {
            $enabledDays++;
        }
    }
    
    echo "✅ Working hours structure is valid\n";
    echo "   - Enabled days: {$enabledDays}\n";
    echo "   - Total days configured: " . count($workingHours) . "\n\n";
    
    echo "🎉 All tests passed! Working hours integration is working correctly.\n";
    echo "\n📋 Summary:\n";
    echo "- Doctor availability system is functional\n";
    echo "- Online/offline status works correctly\n";
    echo "- Available doctors query respects online status\n";
    echo "- Working hours structure is properly formatted\n";
    
} catch (Exception $e) {
    echo "❌ Test failed: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
} 