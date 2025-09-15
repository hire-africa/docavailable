<?php
require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Appointment;
use App\Models\User;
use Carbon\Carbon;

echo "🧪 Testing Delete Endpoint\n";
echo "==========================\n\n";

try {
    // Find a doctor
    $doctor = User::where('user_type', 'doctor')->first();
    if (!$doctor) {
        echo "❌ No doctor found in database\n";
        exit(1);
    }
    echo "✅ Found doctor: {$doctor->first_name} {$doctor->last_name} (ID: {$doctor->id})\n";

    // Find expired appointments for this doctor
    $expiredAppointments = Appointment::where('doctor_id', $doctor->id)
        ->get()
        ->filter(function ($appointment) {
            $appointmentDateTime = Carbon::parse($appointment->appointment_date . ' ' . $appointment->appointment_time);
            return $appointmentDateTime->isPast();
        });
    
    echo "📅 Expired appointments for doctor {$doctor->id}: " . $expiredAppointments->count() . "\n\n";
    
    if ($expiredAppointments->count() === 0) {
        echo "❌ No expired appointments found for this doctor\n";
        exit(1);
    }
    
    foreach ($expiredAppointments as $appointment) {
        echo "📋 Testing delete for appointment ID: {$appointment->id}\n";
        echo "  Date: {$appointment->appointment_date}\n";
        echo "  Time: {$appointment->appointment_time}\n";
        echo "  Status: {$appointment->status}\n";
        echo "  Patient ID: {$appointment->patient_id}\n";
        echo "  Doctor ID: {$appointment->doctor_id}\n";
        
        // Check if appointment has expired
        $appointmentDateTime = Carbon::parse($appointment->appointment_date . ' ' . $appointment->appointment_time);
        $isExpired = $appointmentDateTime->isPast();
        echo "  Is Expired: " . ($isExpired ? 'YES' : 'NO') . "\n";
        
        if (!$isExpired) {
            echo "  ⚠️ Appointment has not expired - skipping\n";
            continue;
        }
        
        echo "  ✅ Appointment is expired - proceeding with delete test\n";
        
        // Test the delete functionality
        echo "  🧪 Testing delete functionality...\n";
        
        // Simulate the delete request
        $request = new \Illuminate\Http\Request();
        $request->setUserResolver(function () use ($doctor) {
            return $doctor;
        });
        
        $appointmentService = new \App\Services\AppointmentService();
        
        try {
            $result = $appointmentService->deleteExpiredAppointment($request, $appointment->id);
            echo "  ✅ Delete functionality works! Appointment deleted successfully.\n";
            
            // Verify the deletion
            $deletedAppointment = Appointment::find($appointment->id);
            if (!$deletedAppointment) {
                echo "  📊 Verification - Appointment successfully deleted from database\n";
            } else {
                echo "  ❌ Verification failed - Appointment still exists in database\n";
            }
            
        } catch (\Exception $e) {
            echo "  ❌ Delete functionality failed: " . $e->getMessage() . "\n";
            echo "  File: " . $e->getFile() . "\n";
            echo "  Line: " . $e->getLine() . "\n";
        }
        
        echo "  ---\n";
        break; // Only test the first expired appointment
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n";
    echo "Line: " . $e->getLine() . "\n";
}

echo "\n🎉 Delete endpoint test completed!\n"; 