<?php

require_once __DIR__ . '/../backend/vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\TextSession;
use App\Models\User;

echo "🔍 DEBUGGING ACTIVE SESSIONS\n";
echo "============================\n\n";

try {
    // Check all text sessions
    echo "📋 All Text Sessions:\n";
    $allSessions = TextSession::with(['patient', 'doctor'])->get();
    echo "Total sessions: " . $allSessions->count() . "\n\n";
    
    foreach ($allSessions as $session) {
        echo "Session ID: {$session->id}\n";
        echo "  Status: {$session->status}\n";
        echo "  Patient: {$session->patient->first_name} {$session->patient->last_name} (ID: {$session->patient_id})\n";
        echo "  Doctor: {$session->doctor->first_name} {$session->doctor->last_name} (ID: {$session->doctor_id})\n";
        echo "  Started: {$session->started_at}\n";
        echo "  Last Activity: {$session->last_activity_at}\n";
        echo "  Sessions Remaining: {$session->sessions_remaining_before_start}\n";
        echo "  Sessions Used: {$session->sessions_used}\n";
        echo "  Remaining Time: {$session->getRemainingTimeMinutes()} minutes\n";
        echo "  Has Run Out of Time: " . ($session->hasRunOutOfTime() ? 'YES' : 'NO') . "\n";
        echo "\n";
    }
    
    // Check active sessions specifically
    echo "📋 Active Sessions (active or waiting_for_doctor):\n";
    $activeSessions = TextSession::with(['patient', 'doctor'])
        ->whereIn('status', ['active', 'waiting_for_doctor'])
        ->get();
    
    echo "Active sessions count: " . $activeSessions->count() . "\n\n";
    
    foreach ($activeSessions as $session) {
        echo "Active Session ID: {$session->id}\n";
        echo "  Status: {$session->status}\n";
        echo "  Patient: {$session->patient->first_name} {$session->patient->last_name} (ID: {$session->patient_id})\n";
        echo "  Doctor: {$session->doctor->first_name} {$session->doctor->last_name} (ID: {$session->doctor_id})\n";
        echo "  Remaining Time: {$session->getRemainingTimeMinutes()} minutes\n";
        echo "  Remaining Sessions: {$session->getRemainingSessions()}\n";
        echo "\n";
    }
    
    // Check patients
    echo "📋 Patients:\n";
    $patients = User::where('user_type', 'patient')->get();
    echo "Total patients: " . $patients->count() . "\n";
    
    foreach ($patients as $patient) {
        $patientSessions = TextSession::where('patient_id', $patient->id)
            ->whereIn('status', ['active', 'waiting_for_doctor'])
            ->count();
        echo "  {$patient->first_name} {$patient->last_name} (ID: {$patient->id}) - Active sessions: {$patientSessions}\n";
    }
    
    echo "\n";
    
    // Check doctors
    echo "📋 Doctors:\n";
    $doctors = User::where('user_type', 'doctor')->get();
    echo "Total doctors: " . $doctors->count() . "\n";
    
    foreach ($doctors as $doctor) {
        $doctorSessions = TextSession::where('doctor_id', $doctor->id)
            ->whereIn('status', ['active', 'waiting_for_doctor'])
            ->count();
        echo "  Dr. {$doctor->first_name} {$doctor->last_name} (ID: {$doctor->id}) - Active sessions: {$doctorSessions}\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}

echo "\n✅ Debug completed!\n";
