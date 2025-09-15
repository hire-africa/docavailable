<?php

require_once __DIR__ . '/../backend/vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Appointment;
use App\Models\User;

echo "🔍 DEBUGGING APPOINTMENTS\n";
echo "=========================\n\n";

try {
    // Check all appointments
    echo "📋 All Appointments:\n";
    $allAppointments = Appointment::with(['patient', 'doctor'])->get();
    echo "Total appointments: " . $allAppointments->count() . "\n\n";
    
    foreach ($allAppointments as $appointment) {
        echo "Appointment ID: {$appointment->id}\n";
        echo "  Status: {$appointment->status}\n";
        echo "  Patient: {$appointment->patient->first_name} {$appointment->patient->last_name} (ID: {$appointment->patient_id})\n";
        echo "  Doctor: {$appointment->doctor->first_name} {$appointment->doctor->last_name} (ID: {$appointment->doctor_id})\n";
        echo "  Scheduled Time: {$appointment->scheduled_time}\n";
        echo "  Created: {$appointment->created_at}\n";
        echo "  Updated: {$appointment->updated_at}\n";
        echo "  Patient Joined: " . ($appointment->patient_joined ? $appointment->patient_joined : 'Not joined') . "\n";
        echo "  Doctor Joined: " . ($appointment->doctor_joined ? $appointment->doctor_joined : 'Not joined') . "\n";
        echo "\n";
    }
    
    // Check pending/confirmed appointments (should show in messages)
    echo "📋 Pending/Confirmed Appointments (should show in messages):\n";
    $activeAppointments = Appointment::with(['patient', 'doctor'])
        ->whereIn('status', ['pending', 'confirmed'])
        ->get();
    
    echo "Active appointments count: " . $activeAppointments->count() . "\n\n";
    
    foreach ($activeAppointments as $appointment) {
        echo "Active Appointment ID: {$appointment->id}\n";
        echo "  Status: {$appointment->status}\n";
        echo "  Patient: {$appointment->patient->first_name} {$appointment->patient->last_name} (ID: {$appointment->patient_id})\n";
        echo "  Doctor: {$appointment->doctor->first_name} {$appointment->doctor->last_name} (ID: {$appointment->doctor_id})\n";
        echo "  Scheduled Time: {$appointment->scheduled_time}\n";
        echo "  Patient Joined: " . ($appointment->patient_joined ? $appointment->patient_joined : 'Not joined') . "\n";
        echo "  Doctor Joined: " . ($appointment->doctor_joined ? $appointment->doctor_joined : 'Not joined') . "\n";
        echo "\n";
    }
    
    // Check patients and their appointments
    echo "📋 Patients and Their Appointments:\n";
    $patients = User::where('user_type', 'patient')->get();
    
    foreach ($patients as $patient) {
        $patientAppointments = Appointment::where('patient_id', $patient->id)
            ->whereIn('status', ['pending', 'confirmed'])
            ->count();
        echo "  {$patient->first_name} {$patient->last_name} (ID: {$patient->id}) - Active appointments: {$patientAppointments}\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}

echo "\n✅ Debug completed!\n";
