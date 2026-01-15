# One-Time Manual Recovery Script: Implementation

## Summary

Implemented a one-time, manually executable recovery script that creates sessions for past confirmed appointments that missed auto-start. The script is idempotent, safe to re-run, and never affects instant sessions.

## Architecture Decisions Implemented

### 1. Form Factor: Manual Artisan Command

**Decision**: Implemented as a manual Artisan command (`appointments:recover-sessions`) that is:
- **Not registered in scheduler/cron** - Never runs automatically
- **Requires explicit confirmation** - Default is dry-run mode, requires `--execute` flag to actually create sessions
- **Operator confirmation** - When `--execute` is used, prompts for confirmation before proceeding

**Implementation**:
- Command signature: `appointments:recover-sessions`
- Default mode: Dry-run (no changes)
- Execution mode: Requires `--execute` flag + confirmation prompt

### 2. Selection Criteria

**Decision**: Script selects only appointments with:
- `status = CONFIRMED`
- `appointment_datetime_utc < now_utc()`
- `session_id IS NULL`

**Additional Safety**:
- Optional `--lookback` parameter (24h, 7d, 30d, or "all")
- Prevents mass-processing very old data unless explicitly requested
- Default lookback: 24 hours

**Implementation**:
```php
$query = Appointment::where('status', Appointment::STATUS_CONFIRMED)
    ->whereNull('session_id')
    ->where('appointment_datetime_utc', '<', $now);
```

### 3. Idempotency + "Never Create Duplicate Sessions"

#### 3.1 Row-Level Locking Per Appointment

**Decision**: For each candidate appointment, run a transaction with a row lock:
- Re-fetch appointment `FOR UPDATE`
- If `session_id` is no longer null or status changed, skip
- Else create the session and update the appointment

**Implementation**:
```php
return DB::transaction(function () use ($appointment) {
    $lockedAppointment = Appointment::where('id', $appointment->id)
        ->lockForUpdate()
        ->first();
    
    // Idempotency checks
    if ($lockedAppointment->session_id !== null) {
        return ['action' => 'skipped', 'reason' => 'session_id_already_set'];
    }
    
    if ($lockedAppointment->status !== Appointment::STATUS_CONFIRMED) {
        return ['action' => 'skipped', 'reason' => 'status_changed'];
    }
    
    // Create session and update appointment...
});
```

#### 3.2 Uniqueness Rule

**Decision**: For appointment-driven sessions, the canonical uniqueness key is:
- One session per appointment per modality (text vs call)
- Since we only support one modality per appointment, this simplifies to: one session per appointment

**Implementation**: The row-level lock + idempotency check ensures no duplicate sessions are created, even if the script is run multiple times concurrently.

### 4. "Use createSession()" Without Affecting Instant Sessions

**Decision**: Script calls the backend `createSession()` service (same domain service boundary as Talk Now) with:
- `source = APPOINTMENT`
- `patient_id` and `doctor_id` taken from the appointment
- Modality derived from appointment fields (text/call)

**Guarantee**: Instant sessions are not touched because:
- Query is only against `appointments` table
- Only targets `status=CONFIRMED` and `session_id IS NULL`
- Never generates `direct_session_*` IDs

**Implementation**:
```php
if ($modality === 'text') {
    return $this->sessionCreationService->createTextSession(
        $patientId,
        $doctorId,
        $reason,
        'APPOINTMENT', // source
        $appointment->id // appointmentId
    );
} else {
    return $this->sessionCreationService->createCallSession(
        $patientId,
        $doctorId,
        $callType,
        (string) $appointment->id,
        $reason,
        'APPOINTMENT' // source
    );
}
```

### 5. Appointment Update Rules

**Decision**: For each successfully created session:
- Update appointment atomically:
  - `set session_id = <created_session_id>`
  - `set status = IN_PROGRESS`
- Do not change any other fields
- Do not backfill anything else in this script

**Implementation**:
```php
$lockedAppointment->update([
    'session_id' => $sessionId,
    'status' => Appointment::STATUS_IN_PROGRESS,
]);
```

### 6. Operator UX / Safety Features

#### 6.1 Dry-Run Mode

**Decision**: Default mode is dry-run (prints what would be updated). Only proceeds when explicit `--execute` flag is provided.

**Implementation**:
- Default: `$isDryRun = !$this->option('execute')`
- Dry-run shows what would be created without making changes
- Execution mode requires confirmation prompt

#### 6.2 Batching + Throttling

**Decision**: Process in small batches (e.g., 50–200 per run) with optional `--limit`.

**Implementation**:
- Default limit: 100 appointments per run
- Configurable via `--limit` option
- Processes appointments in order (oldest first)

#### 6.3 Audit Logging

**Decision**: Emit structured log line per processed appointment with:
- `appointment_id`
- `created session_id`
- `timestamps`
- `result` (created/skipped/failed)
- `error message` if failed

**Implementation**:
- Structured JSON audit log per appointment
- Summary statistics (created/skipped/failed)
- Application log entry with summary
- Debug mode shows detailed progress

### 7. Failure Handling (Non-Breaking)

**Decision**: Fail "per appointment" not "all or nothing":
- One bad record should not abort the whole recovery
- Do not attempt rollback of already-created sessions automatically
- Rely on:
  - Idempotent rerun behavior
  - Manual operator remediation if needed

**Implementation**:
- Each appointment processed in try-catch
- Failures logged but don't stop processing
- Already-created sessions remain (idempotent rerun handles duplicates)

## Usage Examples

### Dry-Run (Default)
```bash
php artisan appointments:recover-sessions
```

### Dry-Run with Custom Lookback
```bash
php artisan appointments:recover-sessions --lookback=7d
```

### Dry-Run with Limit
```bash
php artisan appointments:recover-sessions --limit=50
```

### Execute (Requires Confirmation)
```bash
php artisan appointments:recover-sessions --execute
```

### Execute with Custom Parameters
```bash
php artisan appointments:recover-sessions --execute --lookback=30d --limit=200
```

### Debug Mode
```bash
php artisan appointments:recover-sessions --execute --debug
```

## Output Format

### Dry-Run Output
```
⚠️  DRY-RUN MODE - No changes will be made
   Use --execute flag to actually create sessions

🔄 Starting appointment session recovery...
   Lookback: 24h
   Limit: 100
   Mode: DRY-RUN

📋 Found 5 candidate appointment(s)

✅ [DRY-RUN] Would create session for appointment 123 (modality: text)
✅ [DRY-RUN] Would create session for appointment 124 (modality: call)
⏭️  Skipped appointment 125: session_id_already_set

📊 Summary:
   Created: 2
   Skipped: 1
   Failed:  0
```

### Execution Output
```
⚠️  EXECUTION MODE - Sessions will be created
Are you sure you want to proceed? (yes/no) [no]:
> yes

🔄 Starting appointment session recovery...
   Lookback: 24h
   Limit: 100
   Mode: EXECUTE

📋 Found 5 candidate appointment(s)

✅ Created session 456 for appointment 123 (modality: text)
✅ Created session 457 for appointment 124 (modality: call)
⏭️  Skipped appointment 125: session_id_already_set

📊 Summary:
   Created: 2
   Skipped: 1
   Failed:  0
```

## Safety Guarantees

✅ **Never Automatic**: Not registered in scheduler, requires manual execution  
✅ **Dry-Run by Default**: No changes unless `--execute` flag provided  
✅ **Confirmation Required**: Execution mode requires operator confirmation  
✅ **Idempotent**: Safe to re-run, prevents duplicate sessions via row-level locks  
✅ **Per-Appointment Failure**: One bad record doesn't abort the whole recovery  
✅ **No Instant Session Interference**: Only queries appointments table  
✅ **Audit Trail**: Structured logging for every processed appointment  
✅ **Lookback Protection**: Default 24h lookback prevents mass-processing old data  

## Files Created

1. **`backend/app/Console/Commands/RecoverAppointmentSessions.php`**
   - Main recovery script implementation
   - Idempotent session creation
   - Row-level locking for safety
   - Dry-run and execution modes
   - Audit logging

## Integration Points

- **SessionCreationService**: Uses same service as Talk Now and auto-start job
- **Appointment Model**: Updates `session_id` and `status` fields
- **Database Transactions**: Ensures atomicity and idempotency
- **Application Logging**: Structured audit trail

## Migration Notes

- This script is intended for one-time recovery of appointments that missed auto-start
- After running, future appointments will be handled by the auto-start background job
- The script can be safely re-run if needed (idempotent)
- No changes to existing appointment or session data beyond setting `session_id` and `status`
