<?php

/**
 * Check why a video appointment hasn't activated
 * 
 * Usage: php check_video_appointment.php <appointment_id>
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Appointment;
use App\Services\TimezoneService;
use Carbon\Carbon;

if ($argc < 2) {
    echo "Usage: php check_video_appointment.php <appointment_id>\n";
    exit(1);
}

$appointmentId = $argv[1];

echo "🔍 Checking video appointment ID: {$appointmentId}\n\n";

$appointment = Appointment::find($appointmentId);

if (!$appointment) {
    echo "❌ Appointment not found!\n";
    exit(1);
}

echo "Appointment details:\n";
echo "  - ID: {$appointment->id}\n";
echo "  - Type: {$appointment->appointment_type}\n";
echo "  - Status: {$appointment->status} (1=confirmed)\n";
echo "  - Date: {$appointment->appointment_date}\n";
echo "  - Time: {$appointment->appointment_time}\n";
echo "  - Timezone: " . ($appointment->user_timezone ?? 'Africa/Blantyre') . "\n";
echo "  - Session ID: " . ($appointment->session_id ?? 'NULL') . "\n";
echo "  - Call Unlocked At: " . ($appointment->call_unlocked_at ?? 'NULL') . "\n\n";

// Check if appointment would be found by the query
echo "Query checks:\n";
$statusCheck = $appointment->status == Appointment::STATUS_CONFIRMED;
echo "  - Status is CONFIRMED (1): " . ($statusCheck ? '✅ YES' : '❌ NO') . "\n";

$sessionIdCheck = is_null($appointment->session_id);
echo "  - Session ID is NULL: " . ($sessionIdCheck ? '✅ YES' : '❌ NO') . "\n";

$wouldBeFound = $statusCheck && $sessionIdCheck;
echo "  - Would be found by query: " . ($wouldBeFound ? '✅ YES' : '❌ NO') . "\n\n";

// Check time
echo "Time check:\n";
$now = Carbon::now('UTC');
echo "  - Current UTC time: {$now->toDateTimeString()}\n";

$timeReached = TimezoneService::isAppointmentTimeReached(
    $appointment->appointment_date,
    $appointment->appointment_time,
    $appointment->user_timezone ?? 'Africa/Blantyre',
    5 // buffer minutes
);

echo "  - Time reached (with 5min buffer): " . ($timeReached ? '✅ YES' : '❌ NO') . "\n";

// Calculate appointment UTC time
try {
    $appointmentUTC = TimezoneService::convertToUTC(
        $appointment->appointment_date,
        $appointment->appointment_time,
        $appointment->user_timezone ?? 'Africa/Blantyre'
    );
    
    if ($appointmentUTC) {
        echo "  - Appointment UTC time: {$appointmentUTC->toDateTimeString()}\n";
        $diffMinutes = $now->diffInMinutes($appointmentUTC, false);
        echo "  - Minutes difference: {$diffMinutes} (negative = past, positive = future)\n";
    }
} catch (\Exception $e) {
    echo "  - Error calculating UTC time: {$e->getMessage()}\n";
}

echo "\n";

// Check if chat room exists
$chatRoomName = "appointment_{$appointment->id}";
$chatRoom = \Illuminate\Support\Facades\DB::table('chat_rooms')
    ->where('name', $chatRoomName)
    ->first();

echo "Chat room check:\n";
if ($chatRoom) {
    echo "  - Chat room exists: ✅ YES (ID: {$chatRoom->id}, Type: {$chatRoom->type})\n";
} else {
    echo "  - Chat room exists: ❌ NO\n";
}

echo "\n";

// Summary
echo "Summary:\n";
if (!$wouldBeFound) {
    echo "  ❌ Appointment would NOT be found by the activation query\n";
    if (!$statusCheck) {
        echo "     - Status is not CONFIRMED\n";
    }
    if (!$sessionIdCheck) {
        echo "     - Session ID is not NULL\n";
    }
} else if (!$timeReached) {
    echo "  ❌ Appointment time has NOT been reached yet\n";
} else {
    echo "  ✅ Appointment should be activated!\n";
    if (!$appointment->call_unlocked_at) {
        echo "     - But call_unlocked_at is NULL - activation may have failed\n";
    }
    if (!$chatRoom) {
        echo "     - Chat room not created - activation may have failed\n";
    }
}

echo "\n";
