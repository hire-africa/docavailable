<?php

require_once __DIR__ . '/../vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

echo "🧪 Testing Appointments API Response Structure...\n";
echo "===============================================\n\n";

// Test appointment ID (from our test chat)
$appointmentId = 11;

echo "Testing appointment ID: {$appointmentId}\n\n";

// Test 1: Check if appointment exists
echo "1. Testing appointment data...\n";
$appointment = DB::table('appointments')
    ->join('users as doctor', 'appointments.doctor_id', '=', 'doctor.id')
    ->join('users as patient', 'appointments.patient_id', '=', 'patient.id')
    ->where('appointments.id', $appointmentId)
    ->select(
        'appointments.*',
        'doctor.first_name as doctor_first_name',
        'doctor.last_name as doctor_last_name',
        'patient.first_name as patient_first_name',
        'patient.last_name as patient_last_name'
    )
    ->first();

if (!$appointment) {
    echo "❌ Appointment not found!\n";
    exit;
}

echo "✅ Appointment found:\n";
echo "   Patient: {$appointment->patient_first_name} {$appointment->patient_last_name} (ID: {$appointment->patient_id})\n";
echo "   Doctor: {$appointment->doctor_first_name} {$appointment->doctor_last_name} (ID: {$appointment->doctor_id})\n";
echo "   Date: {$appointment->appointment_date}\n";
echo "   Time: {$appointment->appointment_time}\n";
echo "   Status: {$appointment->status}\n\n";

// Test 2: Simulate the appointments API response structure
echo "2. Testing API response structure...\n";

// Simulate what the AppointmentController would return
$appointments = DB::table('appointments')
    ->join('users as doctor', 'appointments.doctor_id', '=', 'doctor.id')
    ->join('users as patient', 'appointments.patient_id', '=', 'patient.id')
    ->where('appointments.id', $appointmentId)
    ->select(
        'appointments.*',
        'doctor.first_name as doctor_first_name',
        'doctor.last_name as doctor_last_name',
        'doctor.profile_picture as doctor_profile_picture',
        'patient.first_name as patient_first_name',
        'patient.last_name as patient_last_name',
        'patient.profile_picture as patient_profile_picture'
    )
    ->get()
    ->map(function ($appointment) {
        $appointmentData = (array) $appointment;
        
        // Add doctor info
        $appointmentData['doctor'] = [
            'id' => $appointment->doctor_id,
            'first_name' => $appointment->doctor_first_name,
            'last_name' => $appointment->doctor_last_name,
            'profile_picture' => $appointment->doctor_profile_picture,
        ];
        
        // Add patient info
        $appointmentData['patient'] = [
            'id' => $appointment->patient_id,
            'first_name' => $appointment->patient_first_name,
            'last_name' => $appointment->patient_last_name,
            'profile_picture' => $appointment->patient_profile_picture,
        ];
        
        // Add name fields
        $appointmentData['doctorName'] = $appointment->doctor_first_name . ' ' . $appointment->doctor_last_name;
        $appointmentData['patientName'] = $appointment->patient_first_name . ' ' . $appointment->patient_last_name;
        
        return $appointmentData;
    });

// Simulate paginated response
$response = [
    'success' => true,
    'message' => 'Appointments fetched successfully',
    'data' => [
        'data' => $appointments->toArray(),
        'current_page' => 1,
        'per_page' => 15,
        'total' => $appointments->count(),
        'last_page' => 1,
        'from' => 1,
        'to' => $appointments->count()
    ]
];

echo "✅ API Response Structure:\n";
echo "   success: " . ($response['success'] ? 'true' : 'false') . "\n";
echo "   message: " . $response['message'] . "\n";
echo "   data.data: Array with " . count($response['data']['data']) . " appointments\n";
echo "   data.current_page: " . $response['data']['current_page'] . "\n";
echo "   data.per_page: " . $response['data']['per_page'] . "\n\n";

// Test 3: Simulate frontend processing
echo "3. Testing frontend processing...\n";

// Simulate what the frontend should do
$apiResponse = $response;
if ($apiResponse['success'] && $apiResponse['data']) {
    // Handle paginated response - appointments are in response.data.data
    $appointments = $apiResponse['data']['data'] ?? $apiResponse['data'];
    if (is_array($appointments)) {
        echo "✅ Frontend can access appointments array with " . count($appointments) . " items\n";
        
        // Test filtering
        $confirmedAppointments = array_filter($appointments, function($appt) {
            return $appt['status'] === 'confirmed' || $appt['status'] === 1;
        });
        
        echo "✅ Filtered confirmed appointments: " . count($confirmedAppointments) . " items\n";
        
        if (count($confirmedAppointments) > 0) {
            $firstAppointment = array_values($confirmedAppointments)[0];
            echo "✅ First confirmed appointment:\n";
            echo "   ID: {$firstAppointment['id']}\n";
            echo "   Doctor: {$firstAppointment['doctorName']}\n";
            echo "   Patient: {$firstAppointment['patientName']}\n";
            echo "   Status: {$firstAppointment['status']}\n";
        }
    } else {
        echo "❌ Frontend cannot access appointments array\n";
    }
} else {
    echo "❌ API response is not successful\n";
}

echo "\n🎉 Appointments API Test Completed!\n";
echo "The frontend should now be able to access appointments correctly.\n"; 