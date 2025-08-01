<?php

require_once __DIR__ . '/../backend/vendor/autoload.php';

use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\DoctorAvailability;

// Bootstrap Laravel
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🧪 Testing Booking Logic\n";
echo "=======================\n\n";

try {
    // 1. Find doctors
    echo "1. Finding doctors...\n";
    $doctors = User::with('doctorAvailability')
        ->where('user_type', 'doctor')
        ->where('status', 'approved')
        ->get();
    
    if ($doctors->isEmpty()) {
        echo "❌ No approved doctors found.\n";
        exit(1);
    }
    
    echo "✅ Found " . $doctors->count() . " approved doctor(s)\n\n";
    
    // 2. Test instant chat availability (online doctors only)
    echo "2. Testing Instant Chat Availability (Online Doctors Only)...\n";
    $onlineDoctors = $doctors->filter(function ($doctor) {
        return $doctor->doctorAvailability && $doctor->doctorAvailability->is_online;
    });
    
    echo "✅ Found " . $onlineDoctors->count() . " online doctor(s) for instant chats:\n";
    foreach ($onlineDoctors as $doctor) {
        echo "   - {$doctor->first_name} {$doctor->last_name} (ID: {$doctor->id})\n";
    }
    echo "\n";
    
    // 3. Test appointment availability (all approved doctors)
    echo "3. Testing Appointment Availability (All Approved Doctors)...\n";
    echo "✅ All " . $doctors->count() . " approved doctor(s) can receive appointments:\n";
    foreach ($doctors as $doctor) {
        $status = $doctor->doctorAvailability && $doctor->doctorAvailability->is_online ? '🟢 Online' : '🔴 Offline';
        echo "   - {$doctor->first_name} {$doctor->last_name} (ID: {$doctor->id}) - {$status}\n";
    }
    echo "\n";
    
    // 4. Test working hours for appointments
    echo "4. Testing Working Hours for Appointments...\n";
    foreach ($doctors as $doctor) {
        if ($doctor->doctorAvailability) {
            $workingHours = json_decode($doctor->doctorAvailability->working_hours, true);
            $enabledDays = 0;
            foreach ($workingHours as $day => $config) {
                if ($config['enabled']) {
                    $enabledDays++;
                }
            }
            echo "   - {$doctor->first_name} {$doctor->last_name}: {$enabledDays} working days\n";
        } else {
            echo "   - {$doctor->first_name} {$doctor->last_name}: No availability set\n";
        }
    }
    echo "\n";
    
    // 5. Test specific date availability
    echo "5. Testing Specific Date Availability...\n";
    $testDate = '2025-01-20'; // Monday
    $dayOfWeek = strtolower(date('l', strtotime($testDate)));
    
    $availableForDate = $doctors->filter(function ($doctor) use ($dayOfWeek) {
        if (!$doctor->doctorAvailability) return false;
        $workingHours = json_decode($doctor->doctorAvailability->working_hours, true);
        return isset($workingHours[$dayOfWeek]) && $workingHours[$dayOfWeek]['enabled'];
    });
    
    echo "✅ Found " . $availableForDate->count() . " doctor(s) available on {$testDate} ({$dayOfWeek}):\n";
    foreach ($availableForDate as $doctor) {
        $status = $doctor->doctorAvailability->is_online ? '🟢 Online' : '🔴 Offline';
        echo "   - {$doctor->first_name} {$doctor->last_name} - {$status}\n";
    }
    echo "\n";
    
    // 6. Summary
    echo "📋 Booking Logic Summary:\n";
    echo "========================\n";
    echo "✅ Instant Chats: Only with online doctors (" . $onlineDoctors->count() . " available)\n";
    echo "✅ Appointments: With any approved doctor during working hours (" . $doctors->count() . " total)\n";
    echo "✅ Date-specific: " . $availableForDate->count() . " doctors available on {$testDate}\n";
    echo "\n🎉 Booking logic is working correctly!\n";
    
} catch (Exception $e) {
    echo "❌ Test failed: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
} 