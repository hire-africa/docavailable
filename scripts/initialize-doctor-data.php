<?php

require_once __DIR__ . '/../backend/vendor/autoload.php';

use App\Models\User;
use App\Models\DoctorAvailability;
use App\Models\DoctorWallet;

// Bootstrap Laravel
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔧 Initializing Doctor Data\n";
echo "============================\n\n";

// Get all doctors
$doctors = User::where('user_type', 'doctor')->get();

echo "Found " . $doctors->count() . " doctors\n\n";

foreach ($doctors as $doctor) {
    echo "Processing Doctor: {$doctor->display_name} (ID: {$doctor->id})\n";
    
    // 1. Initialize Wallet
    $wallet = DoctorWallet::where('doctor_id', $doctor->id)->first();
    if (!$wallet) {
        $wallet = DoctorWallet::create([
            'doctor_id' => $doctor->id,
            'balance' => rand(50000, 200000), // Random balance between 50K and 200K MWK
            'total_earned' => rand(100000, 500000), // Random total earned
            'total_withdrawn' => rand(0, 100000), // Random total withdrawn
        ]);
        echo "   ✅ Created wallet record\n";
    } else {
        echo "   ℹ️  Wallet already exists\n";
    }
    
    // 2. Initialize Availability
    $availability = DoctorAvailability::where('doctor_id', $doctor->id)->first();
    if (!$availability) {
        // Create default working hours structure
        $defaultWorkingHours = [
            'monday' => ['enabled' => true, 'slots' => [['start' => '09:00', 'end' => '17:00']]],
            'tuesday' => ['enabled' => true, 'slots' => [['start' => '09:00', 'end' => '17:00']]],
            'wednesday' => ['enabled' => true, 'slots' => [['start' => '09:00', 'end' => '17:00']]],
            'thursday' => ['enabled' => true, 'slots' => [['start' => '09:00', 'end' => '17:00']]],
            'friday' => ['enabled' => true, 'slots' => [['start' => '09:00', 'end' => '17:00']]],
            'saturday' => ['enabled' => false, 'slots' => [['start' => '09:00', 'end' => '17:00']]],
            'sunday' => ['enabled' => false, 'slots' => [['start' => '09:00', 'end' => '17:00']]],
        ];
        
        $availability = DoctorAvailability::create([
            'doctor_id' => $doctor->id,
            'is_online' => rand(0, 1) == 1, // Random online status
            'working_hours' => json_encode($defaultWorkingHours),
            'max_patients_per_day' => rand(5, 15),
            'auto_accept_appointments' => rand(0, 1) == 1,
        ]);
        echo "   ✅ Created availability record\n";
    } else {
        echo "   ℹ️  Availability already exists\n";
    }
    
    echo "\n";
}

echo "✅ Doctor data initialization complete!\n";
echo "\nSummary:\n";
echo "- Wallets created/updated: " . DoctorWallet::count() . "\n";
echo "- Availability records: " . DoctorAvailability::count() . "\n"; 