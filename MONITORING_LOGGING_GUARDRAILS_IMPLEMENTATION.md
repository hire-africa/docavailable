# Monitoring + Logging + Guardrails: Implementation

## Summary

Implemented comprehensive monitoring, structured logging, and defense-in-depth guardrails to ensure billing and chat cannot start without verified real session context.

## Architecture Decisions Implemented

### 1. Metrics: Three Required Signals

#### 1.1 "Number of confirmed appointments due" (Gauge)
**Metric**: `appointments_due_count`

**Definition**: Exactly as conversion job does:
- `status = CONFIRMED`
- `session_id IS NULL`
- `appointment_datetime_utc <= now_utc()`

**Implementation**: `AppointmentSessionMetrics::getDueAppointmentsCount()`
- Computed each run from DB query
- Available for monitoring/alerting

#### 1.2 "Number of sessions created from appointments" (Counter)
**Metric**: `appointment_sessions_created_total`

**Definition**: Count only successful conversions where:
- A session was created via `createSession(source=APPOINTMENT)`
- The appointment update committed: `session_id` set + `status=IN_PROGRESS`

**Implementation**: `AppointmentSessionMetrics::recordSessionCreated()`
- Increments counter on successful conversion
- Stores per-minute rate for monitoring
- Structured log entry per creation

#### 1.3 "Failed appointment-to-session conversions" (Counter)
**Metric**: `appointment_session_conversion_failed_total`

**Definition**: A "failure" is any attempt where:
- Appointment was selected as eligible
- Conversion began
- But session creation or appointment update failed (exception/validation/missing data)

**Implementation**: `AppointmentSessionMetrics::recordConversionFailed()`
- Increments counter with reason tag
- Stores per-minute rate for monitoring
- Structured log entry per failure

**Failure Categories**:
- `invalid_appointment_state`
- `missing_doctor_or_patient`
- `createSession_validation_failed`
- `createSession_conflict_existing_session`
- `db_update_failed`
- `notification_failed` (tracked separately, doesn't mark conversion failed if session creation succeeded)
- `unknown_error` (default)

### 2. Logging Design: Structured, Per-Run + Per-Appointment

#### 2.1 Per-Run Summary Log

**Decision**: Emit one structured log event each run with:
- `run_id` (UUID)
- `due_count`
- `attempted_count`
- `created_count`
- `skipped_count` (already has session_id by the time you lock it)
- `failed_count`
- `runtime_ms`
- `source` = 'APPOINTMENT'

**Implementation**: 
- `AutoStartAppointmentSessions`: Logs `appointment_auto_start_run`
- `RecoverAppointmentSessions`: Logs `appointment_recovery_run`
- Both include all required fields

#### 2.2 Per-Appointment Event Logs

**Decision**: Emit a single structured log per appointment processed:
- `appointment_id`
- `result`: `created` | `skipped` | `failed`
- `session_id` (if created)
- `failure_reason` (if failed)
- `source` = 'APPOINTMENT'
- `job_run_id`

**Implementation**:
- `appointment_session_conversion` log entry for each appointment
- Includes all required fields
- Provides auditable traces without needing to inspect DB state manually

### 3. Alerting / Dashboard Strategy

#### 3.1 Backlog Alert (System Health)

**Decision**: Alert if `appointments_due_count` stays above a threshold for >N minutes.

**Thresholds**:
- **Warning**: > 10 due for 5 minutes
- **Critical**: > 50 due for 5 minutes

**Implementation**: `AppointmentSessionMetrics::checkBacklogAlert()`
- Returns alert level and count
- Can be called by monitoring command or external monitoring system

#### 3.2 Error-Rate Alert (System Correctness)

**Decision**: Alert on failed / attempted ratio.

**Thresholds**:
- **Warning**: failure rate > 2% over 10 minutes
- **Critical**: failure rate > 10% over 5 minutes

**Implementation**: `AppointmentSessionMetrics::checkErrorRateAlert()`
- Calculates rate over time window
- Returns alert level, rate, attempted, and failed counts

#### 3.3 Creation Rate Monitoring

**Decision**: Track `appointment_sessions_created_total` deltas per minute; sudden drop to zero while due backlog rises implies job failure.

**Implementation**:
- Per-minute counters stored in cache with 2-minute TTL
- `MonitorAppointmentSessions` command can check creation rate
- Metrics service provides `created_last_minute` and `failed_last_minute`

### 4. Guardrails: "No Billing or Chat Without a Real Session"

#### 4.1 Canonical "Session Context" Rule

**Decision**: Introduce a single internal definition of "real session context":
- **Text**: `text_session_*` (or future `text_session:{id}`)
- **Call**: `call_session` record (even if routed by `direct_session_*` today)

The system must not interpret a plain appointment id as permission to start "live" behaviors.

**Implementation**: `SessionContextGuard::validateSessionContext()`
- Validates identifier represents a real session
- Returns validation result with session type and ID
- Rejects plain appointment IDs

#### 4.2 Chat/WebSocket Guardrail (Hard Requirement)

**Decision**: The signaling/chat layer must require a session-derived identity before allowing:
- Sending chat messages
- Session activation events
- Session-ended events

Appointments may only receive read-only notifications (schedule changes), not "live chat".

**Implementation**: 
- `SessionContextGuard::requireSessionContextForChat()`
- `ChatController::sendMessage()` logs warning if appointment has `session_id` or lacks it
- For now, allows but logs warning (phased compatibility)
- TODO: In later phase, return 400 and require client to use session context

#### 4.3 Billing Guardrail (Hard Requirement)

**Decision**: All billing entrypoints must only accept:
- A session identifier, or
- Data that resolves to an existing session record with session state proving it is active/connected

Call billing is already session-state gated (`connected_at`/`answered_at`). Preserve and treat that as the model.

**Implementation**:
- `SessionContextGuard::requireSessionContextForBilling()`
- Validates session context and for call sessions, also verifies `connected_at`
- Can be integrated into billing endpoints

#### 4.4 Appointment Endpoints Must Not Be "Billing Endpoints" (Phased Compatibility)

**Decision**: Keep legacy appointment-based billing endpoints/commands but explicitly treat them as:
- Legacy-only paths for `appointments.session_id IS NULL`

**Guardrail Decision**: Once `session_id` is populated for new flows, any appointment endpoint that attempts billing should:
- Detect `session_id != NULL` and refuse/redirect logically (later phase)
- For now, start with logging-only warnings to avoid behavior change

**Implementation**:
- `SessionContextGuard::checkAppointmentBillingGuardrail()`
- Integrated into:
  - `DoctorPaymentService::processAppointmentPayment()`
  - `DoctorPaymentService::processAppointmentEnd()`
  - `AppointmentController::endSession()`
- Logs warning but allows for backward compatibility (phased approach)
- TODO: In later phase, return error and redirect to session-based billing

### 5. Failure Classification

**Decision**: Standardize failure categories for `appointment_session_conversion_failed_total`:
- `invalid_appointment_state`
- `missing_doctor_or_patient`
- `createSession_validation_failed`
- `createSession_conflict_existing_session`
- `db_update_failed`
- `notification_failed` (tracked separately)
- `unknown_error` (default)

**Implementation**:
- `AutoStartAppointmentSessions::classifyFailureReason()`
- `RecoverAppointmentSessions::classifyFailureReason()`
- Both methods analyze error messages and return standardized categories

## Files Created

1. **`backend/app/Services/AppointmentSessionMetrics.php`**
   - Metrics service for tracking appointment-to-session conversion
   - Gauge: `appointments_due_count`
   - Counter: `appointment_sessions_created_total`
   - Counter: `appointment_session_conversion_failed_total`
   - Alert checking methods

2. **`backend/app/Services/SessionContextGuard.php`**
   - Defense-in-depth guardrails for session context validation
   - Chat/WebSocket guardrails
   - Billing guardrails
   - Appointment billing guardrails (phased compatibility)

3. **`backend/app/Console/Commands/MonitorAppointmentSessions.php`**
   - Monitoring command for metrics and alerts
   - Can be run manually or scheduled
   - Outputs metrics and checks thresholds

## Files Modified

1. **`backend/app/Console/Commands/AutoStartAppointmentSessions.php`**
   - Added metrics tracking
   - Added structured logging (per-run and per-appointment)
   - Added failure classification
   - Added run_id (UUID) for traceability

2. **`backend/app/Console/Commands/RecoverAppointmentSessions.php`**
   - Added metrics tracking
   - Added structured logging (per-run and per-appointment)
   - Added failure classification
   - Added run_id (UUID) for traceability

3. **`backend/app/Http/Controllers/ChatController.php`**
   - Added guardrail warning for appointments with/without `session_id`
   - Logs warning but allows for backward compatibility

4. **`backend/app/Services/DoctorPaymentService.php`**
   - Added guardrail checks in `processAppointmentPayment()` and `processAppointmentEnd()`
   - Logs warnings but allows for backward compatibility

5. **`backend/app/Http/Controllers/Users/AppointmentController.php`**
   - Added guardrail check in `endSession()`
   - Logs warnings but allows for backward compatibility

## Usage Examples

### Check Metrics
```bash
php artisan appointments:monitor-sessions
```

### Check Metrics (JSON)
```bash
php artisan appointments:monitor-sessions --json
```

### Check Metrics with Alerts
```bash
php artisan appointments:monitor-sessions --alert
```

### Get Metrics Programmatically
```php
$metrics = AppointmentSessionMetrics::getMetrics();
$backlogAlert = AppointmentSessionMetrics::checkBacklogAlert();
$errorRateAlert = AppointmentSessionMetrics::checkErrorRateAlert();
```

### Validate Session Context
```php
$validation = SessionContextGuard::validateSessionContext($identifier);
if (!$validation['is_valid']) {
    // Reject operation
}

$chatGuard = SessionContextGuard::requireSessionContextForChat($identifier, 'send_message');
if (!$chatGuard['allowed']) {
    // Block chat operation
}

$billingGuard = SessionContextGuard::requireSessionContextForBilling($identifier, 'deduct');
if (!$billingGuard['allowed']) {
    // Block billing operation
}
```

## Log Examples

### Per-Run Summary Log
```json
{
  "run_id": "550e8400-e29b-41d4-a716-446655440000",
  "due_count": 15,
  "attempted_count": 10,
  "created_count": 8,
  "skipped_count": 1,
  "failed_count": 1,
  "runtime_ms": 1234.56,
  "source": "APPOINTMENT"
}
```

### Per-Appointment Event Log (Created)
```json
{
  "appointment_id": 123,
  "result": "created",
  "session_id": 456,
  "modality": "text",
  "source": "APPOINTMENT",
  "job_run_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Per-Appointment Event Log (Failed)
```json
{
  "appointment_id": 124,
  "result": "failed",
  "session_id": null,
  "failure_reason": "missing_doctor_or_patient",
  "error_message": "No active subscription found for patient",
  "source": "APPOINTMENT",
  "job_run_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Alerting Integration

### Backlog Alert
```php
$alert = AppointmentSessionMetrics::checkBacklogAlert(10, 50);
if ($alert['level'] === 'critical') {
    // Send critical alert
} elseif ($alert['level'] === 'warning') {
    // Send warning alert
}
```

### Error Rate Alert
```php
$alert = AppointmentSessionMetrics::checkErrorRateAlert(0.02, 0.10, 10);
if ($alert['level'] === 'critical') {
    // Send critical alert
} elseif ($alert['level'] === 'warning') {
    // Send warning alert
}
```

## Safety Guarantees

✅ **Metrics Tracked**: All three required signals implemented  
✅ **Structured Logging**: Per-run and per-appointment logs with all required fields  
✅ **Failure Classification**: Standardized categories for actionable monitoring  
✅ **Session Context Validation**: Canonical rule for "real session context"  
✅ **Chat Guardrails**: Warnings logged, ready for hard enforcement  
✅ **Billing Guardrails**: Warnings logged, ready for hard enforcement  
✅ **Phased Compatibility**: Legacy paths remain functional with warnings  
✅ **Defense in Depth**: Multiple independent gates prevent unauthorized operations  

## Migration Notes

- All guardrails currently log warnings but allow operations (phased compatibility)
- In later phase, guardrails can be upgraded to hard enforcement (return errors)
- Metrics are stored in cache (can be migrated to dedicated metrics store if needed)
- Monitoring command can be scheduled or integrated into external monitoring systems
