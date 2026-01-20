<?php

/**
 * Manually create chat room for an appointment
 * 
 * Usage: php create_appointment_chat_room.php <appointment_id>
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Appointment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

if ($argc < 2) {
    echo "Usage: php create_appointment_chat_room.php <appointment_id>\n";
    exit(1);
}

$appointmentId = $argv[1];

echo "🔧 Creating chat room for appointment ID: {$appointmentId}\n\n";

$appointment = Appointment::find($appointmentId);

if (!$appointment) {
    echo "❌ Appointment not found!\n";
    exit(1);
}

echo "Appointment details:\n";
echo "  - ID: {$appointment->id}\n";
echo "  - Type: {$appointment->appointment_type}\n";
echo "  - Patient ID: {$appointment->patient_id}\n";
echo "  - Doctor ID: {$appointment->doctor_id}\n\n";

try {
    DB::transaction(function () use ($appointment) {
        // Check if chat room already exists for this appointment
        $chatRoomName = "appointment_{$appointment->id}";
        $existingRoom = DB::table('chat_rooms')
            ->where('name', $chatRoomName)
            ->where('type', 'private')
            ->first();

        if ($existingRoom) {
            echo "✅ Chat room already exists (ID: {$existingRoom->id})\n";
            
            // Check participants
            $participants = DB::table('chat_room_participants')
                ->where('chat_room_id', $existingRoom->id)
                ->get();
            
            echo "   Participants: " . $participants->count() . "\n";
            foreach ($participants as $p) {
                echo "     - User {$p->user_id} ({$p->role})\n";
            }
            return;
        }

        // Create appointment chat room
        $roomId = DB::table('chat_rooms')->insertGetId([
            'name' => $chatRoomName,
            'type' => 'private',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        echo "✅ Created chat room ID: {$roomId}\n";

        // Add participants (patient and doctor)
        $participants = [
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
        ];

        foreach ($participants as $participant) {
            DB::table('chat_room_participants')->insertOrIgnore($participant);
            echo "   ✅ Added participant: User {$participant['user_id']}\n";
        }

        Log::info("Manually created appointment chat room", [
            'appointment_id' => $appointment->id,
            'chat_room_id' => $roomId,
            'patient_id' => $appointment->patient_id,
            'doctor_id' => $appointment->doctor_id
        ]);
    });

    echo "\n✅ Successfully created chat room for appointment {$appointmentId}\n";

} catch (\Exception $e) {
    echo "\n❌ Error creating chat room: {$e->getMessage()}\n";
    echo "   Stack trace: {$e->getTraceAsString()}\n";
    Log::error("Failed to manually create appointment chat room", [
        'appointment_id' => $appointmentId,
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
    exit(1);
}
