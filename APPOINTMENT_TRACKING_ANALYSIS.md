# Appointment Tracking Analysis

## Overview
This document analyzes how booked appointments are tracked compared to instant text sessions and identifies critical gaps.

## Critical Issues Found

### 1. **BROKEN: `scheduled_time` Field Does Not Exist**
- **Problem**: `ProcessAppointmentSessions.php` queries `Appointment::where('scheduled_time', '<=', now())` but the `Appointment` model does NOT have a `scheduled_time` field in its `$fillable` array.
- **Impact**: The cron job that processes appointment sessions **NEVER FINDS ANY APPOINTMENTS**.
- **Evidence**: 
  - `Appointment.php` fillable: `appointment_date`, `appointment_time`, `appointment_datetime_utc` ✅
  - `ProcessAppointmentSessions.php` line 35: `->where('scheduled_time', '<=', now())` ❌
- **Result**: No-show detection and doctor join tracking are completely non-functional.

### 2. **Missing: Appointment Activation Logic**
- **Text Sessions**: When a doctor sends their first message, `ChatController` calls `$session->activate()` which:
  - Changes status from `waiting_for_doctor` to `active`
  - Sets `activated_at` timestamp
  - Starts the 10-minute deduction timer
- **Appointments**: No equivalent activation logic exists.
  - `ChatController` only tracks `patient_joined` and `doctor_joined` timestamps (lines 416-427)
  - **No status change** from `confirmed` to `in_progress` when doctor joins
  - **No activation timestamp** is set
  - The `startSession` method in `AppointmentController` sets `actual_start_time` and `status = 'in_progress'`, but this is **manually triggered**, not automatic like text sessions.

### 3. **Missing: Auto-Deduction Tracking for Appointments**
- **Text Sessions**: Have `auto_deductions_processed` field to track 10-minute deductions
- **Appointments**: **NO equivalent field** exists
  - The `Appointment` model has `sessions_deducted` but this is only set at the END
  - There's no mechanism to track periodic deductions during a long appointment
- **Impact**: If an appointment lasts 30 minutes, the system can't track that 3 sessions should be deducted (one every 10 minutes).

### 4. **Inconsistent Session Initialization**
- **Text Sessions**:
  1. Patient starts session → status = `waiting_for_doctor`
  2. Patient sends message → 90-second timer starts
  3. Doctor sends message → `activate()` called → status = `active`, timer starts
  4. Every 10 minutes → auto-deduction via `ProcessAutoDeductions` command
  5. Manual end → `endManually()` → final deduction

- **Appointments**:
  1. Patient books → status = `confirmed`
  2. Patient clicks "Start" → `startSession()` → status = `in_progress` (MANUAL)
  3. Patient/Doctor send messages → Only `patient_joined`/`doctor_joined` timestamps set
  4. **NO auto-deduction mechanism** during the session
  5. Manual end → `endSession()` → single deduction (regardless of duration)

## Recommendations

### Fix 1: Add `scheduled_time` to Appointment Model
```php
protected $fillable = [
    // ... existing fields
    'scheduled_time', // Add this
];
```

### Fix 2: Auto-Activate Appointments When Doctor Joins
Update `ChatController::sendMessage` to activate appointments like text sessions:
```php
if ($appointment && $user->id === $appointment->doctor_id && !$appointment->doctor_joined) {
    $appointment->update([
        'doctor_joined' => now(),
        'status' => 'in_progress', // Auto-activate
        'actual_start_time' => now()
    ]);
}
```

### Fix 3: Add Auto-Deduction Tracking
- Add `auto_deductions_processed` field to `appointments` table
- Create `ProcessAppointmentAutoDeductions` command similar to `ProcessAutoDeductions`
- Track elapsed time from `actual_start_time` (not `appointment_date/time`)

### Fix 4: Unify Session Logic
Consider creating a shared `SessionInterface` or trait that both `TextSession` and `Appointment` implement to ensure consistent behavior.
