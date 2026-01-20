# Appointment Activation Debugging Guide

## Issue: Appointment at 18:00 not activating at 18:05

### Potential Causes

1. **Feature Flag Blocking Activation** (MOST LIKELY)
   - Check if `DISABLE_LEGACY_APPOINTMENT_TRIGGERS=true` in `.env`
   - If enabled, the `appointments:activate-booked` command will skip execution
   - **Fix**: Set `DISABLE_LEGACY_APPOINTMENT_TRIGGERS=false` or remove the env var

2. **Appointment Status Not CONFIRMED**
   - The command only processes appointments with `status = 'confirmed'`
   - **Check**: Query the appointment to verify status

3. **Appointment Already Has session_id**
   - The command skips appointments that already have a `session_id`
   - **Check**: Verify `appointments.session_id IS NULL`

4. **Time Check Failing**
   - The time check uses timezone conversion which might fail
   - **Check**: Verify appointment date/time format and timezone

5. **Exception During Activation**
   - An exception might be thrown during session creation
   - **Check**: Review Laravel logs for errors

### Diagnostic Steps

#### Step 1: Run Diagnostic Script
```bash
cd backend
php diagnose_appointment_activation.php <appointment_id>
```

This will check:
- Feature flag status
- Appointment status
- Session ID presence
- Time check logic
- Time calculations

#### Step 2: Check Feature Flag
```bash
# In Laravel tinker or database
php artisan tinker
>>> \App\Services\FeatureFlags::disableLegacyAppointmentTriggers()
```

If this returns `true`, activation is blocked.

#### Step 3: Check Appointment Status
```sql
SELECT id, status, appointment_type, appointment_date, appointment_time, 
       user_timezone, session_id, created_at
FROM appointments 
WHERE id = <appointment_id>;
```

Verify:
- `status = 'confirmed'`
- `session_id IS NULL`

#### Step 4: Check Time Calculation
```php
// In tinker
$appointment = \App\Models\Appointment::find(<appointment_id>);
$reached = \App\Services\TimezoneService::isAppointmentTimeReached(
    $appointment->appointment_date,
    $appointment->appointment_time,
    $appointment->user_timezone ?? 'Africa/Blantyre'
);
// Should return true if time has been reached
```

#### Step 5: Check Logs
Look for these log entries:
- `🕐 [ActivateBookedAppointments] Checking at ...` - Command is running
- `📋 [ActivateBookedAppointments] Found X confirmed appointment(s)` - How many appointments found
- `🎯 [ActivateBookedAppointments] Appointment X is ready for activation` - Appointment passed time check
- `✅ Activated appointment X` - Appointment was activated
- `Failed to activate appointment` - Error occurred

#### Step 6: Manual Activation Test
```php
// In tinker - manually trigger activation for testing
$appointment = \App\Models\Appointment::find(<appointment_id>);
$command = new \App\Console\Commands\ActivateBookedAppointments();
// This will show detailed output
```

### Enhanced Logging

The command now includes enhanced logging that will show:
- Feature flag status
- Count of appointments found
- Which appointments are ready vs not ready
- Time calculations for appointments not ready
- Detailed error messages

### Common Fixes

1. **Feature Flag Enabled**
   ```env
   # In .env file
   DISABLE_LEGACY_APPOINTMENT_TRIGGERS=false
   ```
   Then restart the cron job container.

2. **Appointment Status Wrong**
   ```sql
   UPDATE appointments 
   SET status = 'confirmed' 
   WHERE id = <appointment_id>;
   ```

3. **Time Check Issue**
   - Verify appointment date/time format matches expected format
   - Verify timezone is valid (e.g., 'Africa/Blantyre')
   - Check that date/time are not NULL

4. **Exception During Activation**
   - Check Laravel logs for full stack trace
   - Common issues: missing subscription, database constraint violations

### Next Steps After Fix

1. Wait for next cron run (runs every minute)
2. Monitor logs for activation messages
3. Verify session_id is populated after activation
4. Verify TextSession record is created (for text appointments)
