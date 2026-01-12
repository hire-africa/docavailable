<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Appointment;
use Carbon\Carbon;

$now = Carbon::now();
echo "Current Carbon Now: " . $now->toDateTimeString() . " (" . $now->timezoneName . ")\n";

$appointments = Appointment::whereIn('status', [Appointment::STATUS_CONFIRMED, Appointment::STATUS_IN_PROGRESS])
    ->get(['id', 'status', 'appointment_date', 'appointment_time', 'patient_id', 'doctor_id']);

echo "Total potential appointments found: " . $appointments->count() . "\n";

foreach ($appointments as $appt) {
    echo "ID: " . $appt->id . " | Status: " . $appt->status . " | Date: " . $appt->appointment_date . " | Time: " . $appt->appointment_time . "\n";

    // Check comparison logic
    $isPastDate = $appt->appointment_date < $now->toDateString();
    $isSameDate = $appt->appointment_date == $now->toDateString();
    $isPastTime = $appt->appointment_time <= $now->copy()->addMinutes(1)->toTimeString(); // same grace

    echo "  - Past Date? " . ($isPastDate ? 'YES' : 'no') . "\n";
    echo "  - Same Date? " . ($isSameDate ? 'YES' : 'no') . "\n";
    if ($isSameDate) {
        echo "  - Past Time (with grace)? " . ($isPastTime ? 'YES' : 'no') . "\n";
    }
}
