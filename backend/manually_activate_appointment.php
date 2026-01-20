<?php

/**
 * Manually activate an appointment for testing
 * 
 * Usage: php manually_activate_appointment.php <appointment_id>
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Appointment;
use App\Console\Commands\ActivateBookedAppointments;
use Illuminate\Support\Facades\Log;

if ($argc < 2) {
    echo "Usage: php manually_activate_appointment.php <appointment_id>\n";
    exit(1);
}

$appointmentId = $argv[1];

echo "🔧 Manually activating appointment ID: {$appointmentId}\n\n";

$appointment = Appointment::find($appointmentId);

if (!$appointment) {
    echo "❌ Appointment not found!\n";
    exit(1);
}

echo "Appointment details:\n";
echo "  - ID: {$appointment->id}\n";
echo "  - Type: {$appointment->appointment_type}\n";
echo "  - Status: {$appointment->status}\n";
echo "  - Date: {$appointment->appointment_date}\n";
echo "  - Time: {$appointment->appointment_time}\n";
echo "  - Timezone: " . ($appointment->user_timezone ?? 'Africa/Blantyre') . "\n";
echo "  - Session ID: " . ($appointment->session_id ?? 'NULL') . "\n";
echo "  - Call Unlocked At: " . ($appointment->call_unlocked_at ?? 'NULL') . "\n\n";

// Create a service class to handle activation without console output
class AppointmentActivationService {
    public function activateAppointment(Appointment $appointment): void
    {
        echo "   Activating appointment {$appointment->id} ({$appointment->appointment_type})\n";

        // For text appointments, we need to create the associated TextSession and ChatRoom
        if ($appointment->appointment_type === 'text') {
            $this->activateTextSession($appointment);
        } else {
            // For audio/video appointments, create appointment chat room when time arrives
            if (in_array($appointment->appointment_type, ['audio', 'voice', 'video'])) {
                $this->activateCallAppointmentChat($appointment);
            }
            
            // Calls must not be auto-started. Only unlock them when eligible.
            // Check if column exists before updating (migration may not have run)
            if (\Illuminate\Support\Facades\Schema::hasColumn('appointments', 'call_unlocked_at')) {
                if (!$appointment->call_unlocked_at) {
                    $appointment->update([
                        'call_unlocked_at' => now(),
                    ]);
                    echo "   ✓ Call unlocked\n";
                }
            } else {
                echo "   ⚠️  call_unlocked_at column does not exist (migration may need to be run)\n";
            }
        }

        Log::info("Activated booked appointment", [
            'appointment_id' => $appointment->id,
            'patient_id' => $appointment->patient_id,
            'doctor_id' => $appointment->doctor_id,
            'appointment_type' => $appointment->appointment_type,
            'activated_at' => now()->toDateTimeString()
        ]);

        echo "   ✅ Activated appointment {$appointment->id}\n";
    }

    private function activateTextSession(Appointment $appointment): void
    {
        try {
            $subscription = \App\Models\Subscription::where('user_id', $appointment->patient_id)
                ->where('is_active', true)
                ->first();

            \Illuminate\Support\Facades\DB::transaction(function () use ($appointment, $subscription) {
                $existingSession = \App\Models\TextSession::where('appointment_id', $appointment->id)->first();

                if ($existingSession) {
                    echo "      Text session already exists for appointment {$appointment->id}\n";
                    $session = $existingSession;

                    if ($session->status === 'scheduled') {
                        $session->update([
                            'status' => 'waiting_for_doctor',
                            'started_at' => now(),
                            'doctor_response_deadline' => null,
                            'sessions_used' => 0
                        ]);
                    }
                    
                    if (!$appointment->session_id) {
                        $appointment->update(['session_id' => $session->id]);
                        echo "      Linked appointment {$appointment->id} to existing session {$session->id}\n";
                    }
                } else {
                    $session = \App\Models\TextSession::create([
                        'appointment_id' => $appointment->id,
                        'patient_id' => $appointment->patient_id,
                        'doctor_id' => $appointment->doctor_id,
                        'status' => 'waiting_for_doctor',
                        'sessions_remaining_before_start' => $subscription ? $subscription->text_sessions_remaining : 0,
                        'doctor_response_deadline' => null,
                        'started_at' => now(),
                        'last_activity_at' => now(),
                        'created_at' => now(),
                        'updated_at' => now(),
                        'sessions_used' => 0
                    ]);

                    echo "   Created text session {$session->id}\n";
                    
                    $appointment->update(['session_id' => $session->id]);
                    echo "      Linked appointment {$appointment->id} to session {$session->id}\n";
                }

                if (!$session->chat_id) {
                    $chatRoomName = "text_session_{$session->id}";

                    $existingRoom = \Illuminate\Support\Facades\DB::table('chat_rooms')
                        ->where('name', $chatRoomName)
                        ->where('type', 'text_session')
                        ->first();

                    if ($existingRoom) {
                        $roomId = $existingRoom->id;
                    } else {
                        $roomId = \Illuminate\Support\Facades\DB::table('chat_rooms')->insertGetId([
                            'name' => $chatRoomName,
                            'type' => 'text_session',
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }

                    $session->update(['chat_id' => $roomId]);

                    \Illuminate\Support\Facades\DB::table('chat_room_participants')->insertOrIgnore([
                        [
                            'chat_room_id' => $roomId,
                            'user_id' => $appointment->patient_id,
                            'role' => 'member',
                            'created_at' => now(),
                            'updated_at' => now()
                        ],
                        [
                            'chat_room_id' => $roomId,
                            'user_id' => $appointment->doctor_id,
                            'role' => 'member',
                            'created_at' => now(),
                            'updated_at' => now()
                        ]
                    ]);

                    echo "   Created/Linked chat room {$roomId}\n";
                }
            });

        } catch (\Exception $e) {
            Log::error("Failed to activate text session infrastructure", [
                'appointment_id' => $appointment->id,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    private function activateCallAppointmentChat(Appointment $appointment): void
    {
        try {
            \Illuminate\Support\Facades\DB::transaction(function () use ($appointment) {
                $chatRoomName = "appointment_{$appointment->id}";
                $existingRoom = \Illuminate\Support\Facades\DB::table('chat_rooms')
                    ->where('name', $chatRoomName)
                    ->where('type', 'private') // Use 'private' type (appointment_chat is not in enum)
                    ->first();

                if ($existingRoom) {
                    echo "   Appointment chat room already exists for appointment {$appointment->id}\n";
                    return;
                }

                // Create appointment chat room (use 'private' type since appointment_chat is not in enum)
                $roomId = \Illuminate\Support\Facades\DB::table('chat_rooms')->insertGetId([
                    'name' => $chatRoomName,
                    'type' => 'private', // Changed from 'appointment_chat' to 'private'
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                echo "   Created appointment chat room {$roomId} for appointment {$appointment->id}\n";

                \Illuminate\Support\Facades\DB::table('chat_room_participants')->insertOrIgnore([
                    [
                        'chat_room_id' => $roomId,
                        'user_id' => $appointment->patient_id,
                        'role' => 'member',
                        'created_at' => now(),
                        'updated_at' => now()
                    ],
                    [
                        'chat_room_id' => $roomId,
                        'user_id' => $appointment->doctor_id,
                        'role' => 'member',
                        'created_at' => now(),
                        'updated_at' => now()
                    ]
                ]);

                echo "   Added participants to appointment chat room {$roomId}\n";
            });

        } catch (\Exception $e) {
            Log::error("Failed to activate appointment chat for call appointment", [
                'appointment_id' => $appointment->id,
                'error' => $e->getMessage()
            ]);
            echo "   ⚠️ Failed to create appointment chat room: {$e->getMessage()}\n";
        }
    }
}

try {
    echo "Attempting activation...\n";
    $service = new AppointmentActivationService();
    $service->activateAppointment($appointment);
    echo "\n✅ Activation completed!\n\n";
    
    // Refresh appointment to see changes
    $appointment->refresh();
    
    echo "After activation:\n";
    echo "  - Call Unlocked At: " . ($appointment->call_unlocked_at ?? 'NULL') . "\n";
    echo "  - Session ID: " . ($appointment->session_id ?? 'NULL') . "\n";
    
    // Check for chat room
    if (in_array($appointment->appointment_type, ['audio', 'voice', 'video'])) {
        $chatRoomName = "appointment_{$appointment->id}";
        $chatRoom = \Illuminate\Support\Facades\DB::table('chat_rooms')
            ->where('name', $chatRoomName)
            ->where('type', 'private') // Use 'private' type
            ->first();
        
        if ($chatRoom) {
            echo "  - Chat Room: Created (ID: {$chatRoom->id})\n";
        } else {
            echo "  - Chat Room: NOT FOUND\n";
        }
    }
    
    echo "\n";
    
} catch (\Exception $e) {
    echo "\n❌ Error during activation:\n";
    echo "  Message: {$e->getMessage()}\n";
    echo "  File: {$e->getFile()}:{$e->getLine()}\n";
    echo "\nStack trace:\n";
    echo $e->getTraceAsString() . "\n";
    exit(1);
}
