<?php

use App\Models\Appointment;
use App\Models\TextSession;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Artisan;

// Load Laravel
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "--- Starting Appointment Activation Test ---\n";

try {
    // 1. Get a patient and a doctor
    $patient = User::where('user_type', 'patient')->first();
    $doctor = User::where('user_type', 'doctor')->first();

    if (!$patient || !$doctor) {
        die("Error: Could not find patient or doctor in database.\n");
    }

    echo "Using Patient ID: {$patient->id}, Doctor ID: {$doctor->id}\n";

    // 2. Create a mock appointment
    // Set appointment_datetime_utc to 1 minute in the past
    $utcTime = Carbon::now('UTC')->subMinutes(1);

    // Set local date/time to something in the future to test if the fix works
    // (Old code would have failed because it checked local time)
    $localDate = Carbon::now()->addHour()->format('Y-m-d');
    $localTime = Carbon::now()->addHour()->format('H:i:s');

    $appointment = Appointment::create([
        'patient_id' => $patient->id,
        'doctor_id' => $doctor->id,
        'appointment_date' => $localDate,
        'appointment_time' => $localTime,
        'appointment_datetime_utc' => $utcTime,
        'status' => Appointment::STATUS_CONFIRMED,
        'appointment_type' => 'text',
        'user_timezone' => 'UTC'
    ]);

    echo "Created Appointment ID: {$appointment->id}\n";
    echo "UTC Time (Past): {$utcTime->toDateTimeString()}\n";
    echo "Local Time (Future): {$localDate} {$localTime}\n";
    echo "Current Status: {$appointment->status}\n";

    // 3. Run the activation command
    echo "Running appointments:activate-booked...\n";
    Artisan::call('appointments:activate-booked');
    echo Artisan::output();

    // 4. Verify the result
    $appointment->refresh();
    echo "Final Status: {$appointment->status}\n";

    $sessionId = $appointment->session_id;
    $hasSession = $sessionId !== null && TextSession::where('id', $sessionId)->exists();

    if ($appointment->status == Appointment::STATUS_CONFIRMED && $hasSession) {
        echo "✅ SUCCESS: Text appointment linked to TextSession without changing appointment status!\n";
        echo "Session ID: {$sessionId}\n";
    } else {
        echo "❌ FAILURE: Expected status CONFIRMED and valid session_id. Got status={$appointment->status}, session_id=" . ($sessionId ?? 'null') . "\n";
    }

    // Clean up
    echo "Cleaning up test appointment...\n";
    $appointment->delete();

} catch (\Exception $e) {
    echo "❌ ERROR: " . $e->getMessage() . "\n";
}

echo "--- Test Finished ---\n";
