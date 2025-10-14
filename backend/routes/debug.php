<?php

use Illuminate\Support\Facades\Route;
use App\Models\User;
use App\Notifications\IncomingCallNotification;
use App\Models\CallSession;

Route::get('/debug/doctor-push-token/{doctorId}', function ($doctorId) {
    $doctor = User::find($doctorId);
    
    if (!$doctor) {
        return response()->json([
            'success' => false,
            'message' => 'Doctor not found'
        ]);
    }
    
    return response()->json([
        'success' => true,
        'doctor' => [
            'id' => $doctor->id,
            'name' => $doctor->first_name . ' ' . $doctor->last_name,
            'email' => $doctor->email,
            'has_push_token' => !empty($doctor->push_token),
            'push_token_length' => strlen($doctor->push_token ?? ''),
            'push_notifications_enabled' => $doctor->push_notifications_enabled,
            'last_seen' => $doctor->last_seen_at,
            'user_type' => $doctor->user_type
        ]
    ]);
});

Route::post('/debug/test-notification/{doctorId}', function ($doctorId) {
    $doctor = User::find($doctorId);
    
    if (!$doctor) {
        return response()->json([
            'success' => false,
            'message' => 'Doctor not found'
        ]);
    }
    
    // Create a test call session
    $callSession = new CallSession([
        'id' => 999,
        'appointment_id' => 'test_appointment',
        'call_type' => 'video',
        'doctor_id' => $doctorId,
        'patient_id' => 1,
        'status' => 'connecting',
        'started_at' => now(),
        'last_activity_at' => now(),
        'reason' => 'Test notification',
        'sessions_used' => 0,
        'sessions_remaining_before_start' => 0,
        'is_connected' => false,
        'call_duration' => 0,
    ]);
    
    // Create a test caller
    $caller = new User([
        'id' => 1,
        'first_name' => 'Test',
        'last_name' => 'Patient',
        'email' => 'test@example.com',
        'user_type' => 'patient'
    ]);
    
    try {
        // Send test notification
        $doctor->notify(new IncomingCallNotification($callSession, $caller));
        
        return response()->json([
            'success' => true,
            'message' => 'Test notification sent successfully',
            'doctor' => [
                'id' => $doctor->id,
                'name' => $doctor->first_name . ' ' . $doctor->last_name,
                'has_push_token' => !empty($doctor->push_token),
                'push_notifications_enabled' => $doctor->push_notifications_enabled
            ]
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Failed to send notification: ' . $e->getMessage(),
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ]);
    }
});