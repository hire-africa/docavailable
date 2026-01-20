<?php

/**
 * Diagnostic script to check why an appointment didn't activate
 * 
 * Usage: php diagnose_appointment_activation.php <appointment_id>
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Appointment;
use App\Services\FeatureFlags;
use App\Services\TimezoneService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

if ($argc < 2) {
    echo "Usage: php diagnose_appointment_activation.php <appointment_id>\n";
    exit(1);
}

$appointmentId = $argv[1];

echo "🔍 Diagnosing appointment activation issue for appointment ID: {$appointmentId}\n\n";

// 1. Check feature flag
echo "1. Checking feature flag...\n";
$featureFlagDisabled = FeatureFlags::disableLegacyAppointmentTriggers();
echo "   DISABLE_LEGACY_APPOINTMENT_TRIGGERS: " . ($featureFlagDisabled ? "ENABLED (⚠️ BLOCKING)" : "DISABLED (✓ OK)") . "\n\n";

if ($featureFlagDisabled) {
    echo "❌ APPOINTMENT ACTIVATION IS BLOCKED BY FEATURE FLAG!\n";
    echo "   Set DISABLE_LEGACY_APPOINTMENT_TRIGGERS=false in .env to enable activation.\n";
    exit(1);
}

// 2. Load appointment
echo "2. Loading appointment...\n";
$appointment = Appointment::find($appointmentId);

if (!$appointment) {
    echo "   ❌ Appointment not found!\n";
    exit(1);
}

echo "   ✓ Appointment found\n";
echo "   - ID: {$appointment->id}\n";
echo "   - Status: {$appointment->status}\n";
echo "   - Type: {$appointment->appointment_type}\n";
echo "   - Date: {$appointment->appointment_date}\n";
echo "   - Time: {$appointment->appointment_time}\n";
echo "   - Timezone: " . ($appointment->user_timezone ?? 'Africa/Blantyre') . "\n";
echo "   - Session ID: " . ($appointment->session_id ?? 'NULL') . "\n";
echo "   - Patient ID: {$appointment->patient_id}\n";
echo "   - Doctor ID: {$appointment->doctor_id}\n\n";

// 3. Check status
echo "3. Checking appointment status...\n";
$expectedStatus = Appointment::STATUS_CONFIRMED;
if ($appointment->status !== $expectedStatus) {
    echo "   ❌ Status is '{$appointment->status}', expected '{$expectedStatus}'\n";
    echo "   ⚠️  Appointment will not be activated with this status.\n\n";
} else {
    echo "   ✓ Status is CONFIRMED\n\n";
}

// 4. Check session_id
echo "4. Checking session_id...\n";
if ($appointment->session_id) {
    echo "   ⚠️  Appointment already has session_id: {$appointment->session_id}\n";
    echo "   ⚠️  Appointments with session_id are skipped by ActivateBookedAppointments command.\n\n";
} else {
    echo "   ✓ No session_id (appointment eligible for activation)\n\n";
}

// 5. Check time
echo "5. Checking appointment time...\n";
$now = Carbon::now('UTC');
echo "   Current UTC time: {$now->toDateTimeString()}\n";

$userTimezone = $appointment->user_timezone ?? 'Africa/Blantyre';
echo "   User timezone: {$userTimezone}\n";
echo "   Appointment date: {$appointment->appointment_date}\n";
echo "   Appointment time: {$appointment->appointment_time}\n";

$timeReached = TimezoneService::isAppointmentTimeReached(
    $appointment->appointment_date,
    $appointment->appointment_time,
    $userTimezone,
    5 // buffer minutes
);

echo "   Time reached check: " . ($timeReached ? "✓ YES" : "❌ NO") . "\n";

if (!$timeReached) {
    // Calculate when it will be reached
    try {
        $appointmentDateTime = TimezoneService::convertToUTC(
            $appointment->appointment_date,
            $appointment->appointment_time,
            $userTimezone
        );
        
        if ($appointmentDateTime) {
            $appointmentUTC = $appointmentDateTime;
            $earliestStart = $now->copy()->subMinutes(5);
            $diff = $appointmentUTC->diffInMinutes($earliestStart, false);
            
            echo "   Appointment UTC time: {$appointmentUTC->toDateTimeString()}\n";
            if ($diff > 0) {
                echo "   ⚠️  Appointment time will be reached in {$diff} minutes\n";
            } else {
                echo "   ⚠️  Appointment time was {$diff} minutes ago\n";
            }
        }
    } catch (\Exception $e) {
        echo "   ⚠️  Could not calculate time difference: {$e->getMessage()}\n";
    }
}

echo "\n";

// 6. Check activation status (for voice/video appointments)
echo "6. Checking activation status...\n";
if (in_array($appointment->appointment_type, ['audio', 'voice', 'video'])) {
    echo "   Appointment type: {$appointment->appointment_type} (call appointment)\n";
    echo "   Call unlocked at: " . ($appointment->call_unlocked_at ?? 'NULL') . "\n";
    
    // Check for chat room
    $chatRoomName = "appointment_{$appointment->id}";
    $chatRoom = \Illuminate\Support\Facades\DB::table('chat_rooms')
        ->where('name', $chatRoomName)
        ->where('type', 'private') // Use 'private' type (appointment_chat is not in enum)
        ->first();
    
    if ($chatRoom) {
        echo "   ✓ Chat room exists: ID {$chatRoom->id}\n";
    } else {
        echo "   ⚠️  Chat room not found (should be created during activation)\n";
    }
    
    if ($appointment->call_unlocked_at) {
        echo "   ✓ Call is unlocked (activation successful)\n";
    } else {
        echo "   ⚠️  Call not unlocked yet (activation may not have run)\n";
    }
    
    echo "\n   NOTE: Voice/Video appointments do NOT create TextSessions.\n";
    echo "   They create chat rooms and unlock calls instead.\n";
    echo "   session_id will remain NULL until a CallSession is started.\n\n";
} else if ($appointment->appointment_type === 'text') {
    echo "   Appointment type: text\n";
    echo "   Session ID: " . ($appointment->session_id ?? 'NULL') . "\n";
    
    // Check for TextSession
    $textSession = \App\Models\TextSession::where('appointment_id', $appointment->id)->first();
    if ($textSession) {
        echo "   ✓ TextSession exists: ID {$textSession->id}\n";
        echo "   Status: {$textSession->status}\n";
    } else {
        echo "   ⚠️  TextSession not found (should be created during activation)\n";
    }
    echo "\n";
}

// 7. Summary
echo "=== SUMMARY ===\n";
$issues = [];

if ($featureFlagDisabled) {
    $issues[] = "Feature flag DISABLE_LEGACY_APPOINTMENT_TRIGGERS is enabled";
}

if ($appointment->status !== $expectedStatus) {
    $issues[] = "Appointment status is '{$appointment->status}', not '{$expectedStatus}'";
}

if ($appointment->appointment_type === 'text' && $appointment->session_id) {
    $issues[] = "Appointment already has session_id: {$appointment->session_id}";
}

if (!$timeReached) {
    $issues[] = "Appointment time has not been reached yet";
}

// Check activation for voice/video
if (in_array($appointment->appointment_type, ['audio', 'voice', 'video'])) {
    if (!$appointment->call_unlocked_at) {
        $issues[] = "Call not unlocked (call_unlocked_at is NULL)";
    }
}

// Check activation for text
if ($appointment->appointment_type === 'text') {
    $textSession = \App\Models\TextSession::where('appointment_id', $appointment->id)->first();
    if (!$textSession) {
        $issues[] = "TextSession not created";
    }
    if (!$appointment->session_id) {
        $issues[] = "session_id not set on appointment";
    }
}

if (empty($issues)) {
    echo "✓ No issues found. Appointment appears to be activated.\n";
    if (in_array($appointment->appointment_type, ['audio', 'voice', 'video'])) {
        echo "\nFor voice/video appointments:\n";
        echo "- Chat room should exist\n";
        echo "- call_unlocked_at should be set\n";
        echo "- session_id will remain NULL until CallSession is started\n";
    }
} else {
    echo "❌ Issues found:\n";
    foreach ($issues as $i => $issue) {
        echo "   " . ($i + 1) . ". {$issue}\n";
    }
    echo "\nNext steps:\n";
    echo "1. Wait for next cron run (runs every minute)\n";
    echo "2. Check logs for activation messages\n";
    echo "3. If still not activating, check for exceptions in logs\n";
}

echo "\n";
