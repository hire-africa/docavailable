<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Appointment;
use App\Models\User;
use Carbon\Carbon;

// Find a patient and doctor
$patient = User::where('user_type', 'patient')->first();
$doctor = User::where('user_type', 'doctor')->first();

if (!$patient || !$doctor) {
    die("Patient or Doctor not found. Patient: " . ($patient ? 'OK' : 'MISSING') . " | Doctor: " . ($doctor ? 'OK' : 'MISSING') . "\n");
}

echo "Using Patient ID: {$patient->id}, Doctor ID: {$doctor->id}\n";

$now = Carbon::now();

// Create an appointment scheduled for 1 minute ago
$appointment = Appointment::create([
    'patient_id' => $patient->id,
    'doctor_id' => $doctor->id,
    'appointment_date' => $now->toDateString(),
    'appointment_time' => $now->subMinutes(1)->toTimeString(),
    'status' => Appointment::STATUS_CONFIRMED,
    'appointment_type' => 'text'
]);

echo "Created test appointment ID: {$appointment->id} with status: {$appointment->status} scheduled for: " . $appointment->appointment_date . " " . $appointment->appointment_time . "\n";
