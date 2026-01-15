# Appointment Auto-Start Background Job Implementation

## Summary

Implemented a scheduled background job that automatically starts sessions for appointments that are due, using idempotent transaction-based logic to prevent duplicate sessions.

## Architecture Decisions

### 1. Scheduling / Runtime Model
- **Command**: `appointments:auto-start-sessions`
- **Cadence**: Runs every 60 seconds (meets 30-60s requirement at upper bound)
- **Distributed Lock**: Uses `Cache::lock()` to ensure only one instance runs across multiple app servers
- **Lock Timeout**: 120 seconds (2 minutes) to prevent deadlocks

### 2. Selection Criteria
The job only considers appointments that are:
- `status = CONFIRMED`
- `session_id IS NULL` (not yet session-bound)
- `appointment_datetime_utc <= now_utc()`

**Batch Processing**: Hard limit per run (default 50, configurable via `--limit` option) to keep each tick fast and reduce lock contention.

### 3. Idempotency Strategy

#### 3.1 Single-Writer Rule
All appointment-based session creation goes through `SessionCreationService`, used by:
- This background job (`source=APPOINTMENT`)
- Future "Start Session" endpoint/UI action for appointments

#### 3.2 DB-Level Idempotency
For each candidate appointment:
1. Acquire row-level lock (`lockForUpdate()`)
2. Re-read appointment under lock
3. If `session_id` is already set OR status is no longer `CONFIRMED`, no-op
4. Otherwise:
   - Create the session
   - Set `appointments.session_id`
   - Set `appointments.status = IN_PROGRESS`
   - Commit transaction

**Invariant**: If process crashes mid-flight, transaction rolls back and next run can safely retry without duplicates.

#### 3.3 Exactly-Once Creation
- Retry-safe: locked re-check ensures no duplicate sessions
- Transaction boundaries prevent partial state
- Row-level locks prevent race conditions

### 4. Shared SessionCreationService

#### 4.1 Server-Side Service
- **File**: `app/Services/SessionCreationService.php`
- **Methods**:
  - `createTextSession()` - Creates text sessions
  - `createCallSession()` - Creates call sessions
- **Source Parameter**: Accepts `source='INSTANT' | 'APPOINTMENT'` but does not branch behavior on it yet
- **Preserves Behavior**: Calls same underlying logic as Talk Now controllers, does not alter billing/socket/payout

#### 4.2 Usage
- **Talk Now controllers**: Call with `source=INSTANT`, `patient_id = auth()->id()`
- **Auto-start job**: Calls with `source=APPOINTMENT`, explicit `patient_id` from appointment

### 5. Session Modality Determination

**Decision**: Modality derived from `appointment.appointment_type`:
- `'text'` → text session
- `'audio'` or `'voice'` → voice call session
- `'video'` → video call session
- **Default**: Falls back to `'text'` if modality cannot be determined

### 6. Notifications (Idempotent)

#### 6.1 Timing
- Notifications sent **AFTER** transaction commits
- Never notify about sessions that were rolled back

#### 6.2 Deduplication
- **Dedup Key**: `appointment:{id}:session_started:{session_id}`
- **Storage**: Cache with 24-hour TTL
- **Check**: Before sending, check if key exists; if yes, skip notification

#### 6.3 Recipients
- **Patient**: "Your appointment session is ready/starting"
- **Doctor**: "Your appointment is starting now"
- Both parties notified via `NotificationService::sendAppointmentSessionStartedNotification()`

### 7. No Instant Session Interference

**Decision**: Job never touches instant sessions because:
- Only queries `appointments` table rows with `status=CONFIRMED` and `session_id IS NULL`
- Instant sessions are identified by `text_session_*` / `direct_session_*` flows and are not eligible
- `SessionCreationService` does not change its `INSTANT` behavior

## Files Created

1. **`backend/app/Services/SessionCreationService.php`**
   - Reusable service for creating text/call sessions
   - Used by both Talk Now controllers and auto-start job

2. **`backend/app/Console/Commands/AutoStartAppointmentSessions.php`**
   - Scheduled command that auto-starts appointment sessions
   - Implements idempotency, distributed locking, batch processing

## Files Modified

1. **`backend/app/Services/NotificationService.php`**
   - Added `sendAppointmentSessionStartedNotification()` method
   - Sends notifications to both patient and doctor

2. **`backend/app/Models/Appointment.php`**
   - Added `session_id` to `$fillable` array

3. **`backend/routes/console.php`**
   - Registered `appointments:auto-start-sessions` command
   - Scheduled to run every minute with `withoutOverlapping()` and `runInBackground()`

## Command Usage

```bash
# Run with default limit (50 appointments)
php artisan appointments:auto-start-sessions

# Run with custom limit
php artisan appointments:auto-start-sessions --limit=100

# Run with debug output
php artisan appointments:auto-start-sessions --debug
```

## Testing Checklist

- [ ] Job runs every 60 seconds via scheduler
- [ ] Distributed lock prevents concurrent runs
- [ ] Only processes appointments with `status=CONFIRMED`, `session_id IS NULL`, `appointment_datetime_utc <= now()`
- [ ] Batch processing respects limit
- [ ] Row-level locks prevent duplicate sessions
- [ ] Transaction rollback on error prevents partial state
- [ ] Session creation uses shared `SessionCreationService`
- [ ] Modality correctly determined from `appointment_type`
- [ ] `appointments.session_id` set after session creation
- [ ] `appointments.status` set to `IN_PROGRESS` after session creation
- [ ] Notifications sent after transaction commit
- [ ] Notification deduplication prevents duplicate notifications
- [ ] Both patient and doctor receive notifications
- [ ] Instant sessions not affected (job only queries appointments table)
- [ ] Retry-safe: same appointment can be picked up again without creating duplicates

## Safety Guarantees

✅ **Idempotent**: Same appointment can be processed multiple times without creating duplicate sessions  
✅ **Transactional**: All-or-nothing updates prevent partial state  
✅ **Locked**: Row-level locks prevent race conditions  
✅ **Distributed**: Cache lock prevents concurrent runs across servers  
✅ **Non-Interfering**: Never touches instant sessions  
✅ **Retry-Safe**: Crashes don't leave system in inconsistent state  

## Future Enhancements

1. **Unique Constraint**: Add unique constraint on session side keyed by `appointment_id` once data model is finalized
2. **Source Branching**: When ready, use `source` parameter to change behavior (analytics, routing, etc.)
3. **Metrics**: Add metrics for processed/skipped/error counts
4. **Alerting**: Alert on high error rates or processing delays
