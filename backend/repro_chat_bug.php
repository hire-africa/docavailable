<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

echo "⚠️  Reproducing ChatController ID Collision Bug...\n";

// 1. Setup Test Data (Force ID Collision)
$collisionId = 999999;
$doctorId = 1; // Assuming distinct
$patientId = 1; // Assuming same for simplicity or distinct

// Cleanup first
DB::table('appointments')->where('id', $collisionId)->delete();
DB::table('text_sessions')->where('id', $collisionId)->delete();

// Create Appointment 999999
DB::table('appointments')->insert([
    'id' => $collisionId,
    'doctor_id' => $doctorId,
    'patient_id' => $patientId,
    'appointment_date' => '2025-01-01',
    'appointment_time' => '10:00:00',
    'status' => 'confirmed',
    'created_at' => now(),
    'updated_at' => now(),
]);

// Create Text Session 999999
DB::table('text_sessions')->insert([
    'id' => $collisionId,
    'doctor_id' => $doctorId,
    'patient_id' => $patientId,
    'status' => 'active',
    'started_at' => '2025-02-02 12:00:00', // Distinct date
    'created_at' => now(),
    'updated_at' => now(),
]);

echo "✅ Created Appointment ID: $collisionId (Date: 2025-01-01)\n";
echo "✅ Created Text Session ID: $collisionId (Date: 2025-02-02)\n";

// 2. Mock Auth
$user = User::first();
Auth::setUser($user);

// 3. Test Controller
$controller = new \App\Http\Controllers\ChatController(
    new \App\Services\MessageStorageService(),
    new \App\Services\AnonymizationService()
);

// We request the TEXT SESSION explicitly
$requestedId = "text_session_$collisionId";
echo "\n🔍 Requesting Chat Info for: $requestedId\n";

try {
    $response = $controller->getChatInfo($requestedId);
    $data = $response->getData(true);

    if (!$data['success']) {
        echo "❌ Request failed: " . $data['message'] . "\n";
        exit(1);
    }

    $resultDate = $data['data']['appointment_date'];
    echo "📄 Returned Date: " . $resultDate . "\n";

    // Check if it matches Appointment (Bug) or Text Session (Correct)
    if (strpos($resultDate, '2025-01-01') !== false) {
        echo "❌ BUG REPRODUCED: Returned Appointment data instead of Text Session data.\n";
        echo "   The controller stripped 'text_session_' and found Appointment #$collisionId first.\n";
    } elseif (strpos($resultDate, '2025-02-02') !== false) {
        echo "✅ CORRECT BEHAVIOR: Returned Text Session data.\n";
    } else {
        echo "❓ Unknown result data.\n";
    }

} catch (\Exception $e) {
    echo "❌ Exception: " . $e->getMessage() . "\n";
}

// Cleanup
DB::table('appointments')->where('id', $collisionId)->delete();
DB::table('text_sessions')->where('id', $collisionId)->delete();
