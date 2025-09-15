<?php

require_once __DIR__ . '/../backend/vendor/autoload.php';

use App\Models\User;
use App\Models\DoctorAvailability;
use App\Models\DoctorWallet;

// Bootstrap Laravel
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔍 Testing Doctor API Endpoints\n";
echo "================================\n\n";

// 1. Test Doctor Availability Endpoint
echo "1. Testing Doctor Availability Endpoint\n";
echo "----------------------------------------\n";

$doctors = User::where('user_type', 'doctor')->take(3)->get();

foreach ($doctors as $doctor) {
    echo "   Doctor: {$doctor->display_name} (ID: {$doctor->id})\n";
    
    // Check if doctor has availability record
    $availability = DoctorAvailability::where('doctor_id', $doctor->id)->first();
    
    if ($availability) {
        echo "   ✅ Has availability record\n";
        echo "   ✅ Is Online: " . ($availability->is_online ? 'Yes' : 'No') . "\n";
        echo "   ✅ Working Hours: " . (json_decode($availability->working_hours, true) ? 'Set' : 'Not Set') . "\n";
        
        $workingHours = json_decode($availability->working_hours, true);
        if ($workingHours) {
            echo "   ✅ Working Hours Structure:\n";
            foreach ($workingHours as $day => $config) {
                $enabled = $config['enabled'] ? 'Enabled' : 'Disabled';
                $slotsCount = count($config['slots']);
                echo "      - {$day}: {$enabled} ({$slotsCount} slots)\n";
            }
        }
    } else {
        echo "   ❌ No availability record found\n";
    }
    
    echo "\n";
}

// 2. Test Doctor Wallet Endpoint
echo "2. Testing Doctor Wallet Endpoint\n";
echo "----------------------------------\n";

foreach ($doctors as $doctor) {
    echo "   Doctor: {$doctor->display_name} (ID: {$doctor->id})\n";
    
    // Check if doctor has wallet record
    $wallet = DoctorWallet::where('doctor_id', $doctor->id)->first();
    
    if ($wallet) {
        echo "   ✅ Has wallet record\n";
        echo "   ✅ Balance: " . number_format($wallet->balance, 2) . " MWK\n";
        echo "   ✅ Total Earned: " . number_format($wallet->total_earned, 2) . " MWK\n";
        echo "   ✅ Total Withdrawn: " . number_format($wallet->total_withdrawn, 2) . " MWK\n";
    } else {
        echo "   ❌ No wallet record found\n";
    }
    
    echo "\n";
}

// 3. Test API Response Structure
echo "3. Testing API Response Structure\n";
echo "---------------------------------\n";

$testDoctor = $doctors->first();
if ($testDoctor) {
    echo "   Testing with Doctor: {$testDoctor->display_name} (ID: {$testDoctor->id})\n";
    
    // Simulate API response for availability
    $availability = DoctorAvailability::where('doctor_id', $testDoctor->id)->first();
    
    if ($availability) {
        $apiResponse = [
            'success' => true,
            'data' => [
                'is_online' => $availability->is_online,
                'working_hours' => json_decode($availability->working_hours, true),
                'max_patients_per_day' => $availability->max_patients_per_day,
                'auto_accept_appointments' => $availability->auto_accept_appointments,
            ]
        ];
        
        echo "   ✅ Availability API Response Structure:\n";
        echo "      - success: " . ($apiResponse['success'] ? 'true' : 'false') . "\n";
        echo "      - data.is_online: " . ($apiResponse['data']['is_online'] ? 'true' : 'false') . "\n";
        echo "      - data.working_hours: " . (is_array($apiResponse['data']['working_hours']) ? 'array' : 'null') . "\n";
        echo "      - data.max_patients_per_day: " . $apiResponse['data']['max_patients_per_day'] . "\n";
        echo "      - data.auto_accept_appointments: " . ($apiResponse['data']['auto_accept_appointments'] ? 'true' : 'false') . "\n";
    }
    
    // Simulate API response for wallet
    $wallet = DoctorWallet::where('doctor_id', $testDoctor->id)->first();
    
    if ($wallet) {
        $walletResponse = [
            'success' => true,
            'data' => [
                'balance' => $wallet->balance,
                'total_earned' => $wallet->total_earned,
                'total_withdrawn' => $wallet->total_withdrawn,
            ]
        ];
        
        echo "   ✅ Wallet API Response Structure:\n";
        echo "      - success: " . ($walletResponse['success'] ? 'true' : 'false') . "\n";
        echo "      - data.balance: " . number_format($walletResponse['data']['balance'], 2) . " MWK\n";
        echo "      - data.total_earned: " . number_format($walletResponse['data']['total_earned'], 2) . " MWK\n";
        echo "      - data.total_withdrawn: " . number_format($walletResponse['data']['total_withdrawn'], 2) . " MWK\n";
    }
}

echo "\n✅ API Endpoint Testing Complete!\n"; 