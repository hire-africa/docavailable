# Production Readiness Implementation

## Overview
This document outlines the production-ready implementation of session-gated architecture with feature flags, comprehensive guardrails, and monitoring.

## Feature Flags

### Environment Variables
Add these to your `.env` file for gradual rollout:

```env
# Session-gated chat enforcement
# When true: Blocks appointment-based chat when session_id exists
# When false: Allows legacy appointment-based chat (with warnings)
ENFORCE_SESSION_GATED_CHAT=false

# Session-gated billing enforcement
# When true: Blocks appointment-based billing when session_id exists
# When false: Allows legacy appointment-based billing (with warnings)
ENFORCE_SESSION_GATED_BILLING=false

# Disable legacy appointment triggers
# When true: Disables ProcessAppointmentSessions and ActivateBookedAppointments
# When false: Allows legacy triggers to run (with session_id filtering)
DISABLE_LEGACY_APPOINTMENT_TRIGGERS=false

# Legacy appointment chat compatibility
# When true: Allows appointment-based chat even when session_id is null (waiting state)
# When false: Blocks appointment-based chat when session_id is null
ALLOW_LEGACY_APPOINTMENT_CHAT=false
```

### Rollout Strategy

**Phase 1: Monitoring (Flags OFF)**
- All flags set to `false`
- System logs warnings but allows operations
- Monitor logs for:
  - Appointment-based chat attempts when `session_id` exists
  - Appointment-based billing attempts when `session_id` exists
  - Legacy trigger executions

**Phase 2: Gradual Enforcement (Flags ON)**
- Set `ENFORCE_SESSION_GATED_CHAT=true` first
- Monitor error rates and client behavior
- Set `ENFORCE_SESSION_GATED_BILLING=true` after chat is stable
- Set `DISABLE_LEGACY_APPOINTMENT_TRIGGERS=true` last

**Phase 3: Full Enforcement (All Flags ON)**
- All enforcement flags enabled
- Legacy compatibility disabled
- System fully session-gated

## Guardrails Implemented

### 1. Chat Guardrails

**Enforced Methods:**
- `sendMessage()` - Blocks when `appointment.session_id` exists
- `getMessages()` - Blocks when `appointment.session_id` exists
- `addReaction()` - Blocks when `appointment.session_id` exists
- `removeReaction()` - Blocks when `appointment.session_id` exists
- `startTyping()` - Blocks when `appointment.session_id` exists
- `stopTyping()` - Blocks when `appointment.session_id` exists
- `replyToMessage()` - Blocks when `appointment.session_id` exists
- `markAsRead()` - Blocks when `appointment.session_id` exists

**Error Responses:**
- **400 SESSION_CONTEXT_REQUIRED**: When `session_id` exists (use session endpoint)
- **403 SESSION_NOT_READY**: When `session_id` is null (waiting for session)

**Session Context Format:**
- Text sessions: `text_session:{id}`
- Call sessions: `call_session:{id}`

### 2. Billing Guardrails

**Enforced Endpoints:**
- `POST /api/appointments/{id}/end-session` - Blocks when `session_id` exists
- `POST /api/appointments/{id}/process-payment` - Blocks when `session_id` exists
- `POST /api/text-appointments/process-deduction` - Blocks when `session_id` exists

**Error Response:**
- **400 SESSION_BILLING_REQUIRED**: When `session_id` exists (use session billing)

### 3. Scheduled Command Guardrails

**ProcessAppointmentSessions:**
- Filters out appointments with `session_id` (only processes legacy)
- Respects `DISABLE_LEGACY_APPOINTMENT_TRIGGERS` flag
- Skips billing for appointments that have sessions

**ActivateBookedAppointments:**
- Skips appointments that already have `session_id`
- Populates `appointments.session_id` when creating text sessions
- Respects `DISABLE_LEGACY_APPOINTMENT_TRIGGERS` flag

## Monitoring & Alerting

### Metrics to Track

1. **Chat Blocked Count**
   - Metric: `chat_blocked_session_context_required_total`
   - Tagged by: `appointment_id`, `session_id`, `operation`
   - Alert: If > 10% of chat requests are blocked

2. **Billing Blocked Count**
   - Metric: `billing_blocked_session_context_required_total`
   - Tagged by: `appointment_id`, `session_id`, `endpoint`
   - Alert: If any billing is blocked (should be zero in production)

3. **Legacy Trigger Executions**
   - Metric: `legacy_trigger_executions_total`
   - Tagged by: `command_name`, `appointments_processed`
   - Alert: If legacy triggers process appointments with `session_id`

4. **Appointment Session Conversion**
   - Metric: `appointment_sessions_created_total` (already implemented)
   - Metric: `appointment_session_conversion_failed_total` (already implemented)
   - Metric: `appointments_due_count` (already implemented)

### Log Patterns to Monitor

```bash
# Chat blocked
grep "SessionContextGuard: Chat operation blocked" logs/laravel.log

# Billing blocked
grep "SessionContextGuard: Billing blocked" logs/laravel.log

# Legacy triggers
grep "Legacy appointment triggers disabled" logs/laravel.log
```

## Testing Checklist

### Unit Tests Required

1. **Chat Guardrails**
   - ✅ `sendMessage()` blocks when `session_id` exists
   - ✅ `getMessages()` blocks when `session_id` exists
   - ✅ All chat methods respect feature flags

2. **Billing Guardrails**
   - ✅ `endSession()` blocks when `session_id` exists
   - ✅ `processPayment()` blocks when `session_id` exists
   - ✅ `processDeduction()` blocks when `session_id` exists

3. **Scheduled Commands**
   - ✅ `ProcessAppointmentSessions` filters out `session_id` appointments
   - ✅ `ActivateBookedAppointments` skips `session_id` appointments
   - ✅ Commands respect `DISABLE_LEGACY_APPOINTMENT_TRIGGERS` flag

4. **Idempotency**
   - ✅ Auto-start job creates only one session per appointment
   - ✅ Recovery command is idempotent

### Integration Tests Required

1. **End-to-End Chat Flow**
   - Appointment created → Session auto-started → Chat works via session context
   - Appointment created → Session not ready → Chat blocked with clear error

2. **End-to-End Billing Flow**
   - Session created → Session ended → Billing processed via session
   - Appointment with session → End via appointment endpoint → Blocked

## Runbooks

### What to do if backlog grows

1. **Check Metrics**
   ```bash
   php artisan appointments:monitor-sessions
   ```

2. **Check Auto-Start Job**
   ```bash
   php artisan appointments:auto-start-sessions --verbose
   ```

3. **Manual Recovery (if needed)**
   ```bash
   php artisan appointments:recover-sessions --lookback=24 --limit=100 --execute
   ```

4. **Check Logs**
   ```bash
   tail -f storage/logs/laravel.log | grep "appointment.*session"
   ```

### How to run recovery command safely

1. **Dry Run First**
   ```bash
   php artisan appointments:recover-sessions --lookback=24 --limit=10
   ```

2. **Review Output**
   - Check which appointments will be processed
   - Verify no duplicate sessions will be created

3. **Execute in Batches**
   ```bash
   php artisan appointments:recover-sessions --lookback=24 --limit=50 --execute
   ```

4. **Monitor Results**
   ```bash
   php artisan appointments:monitor-sessions
   ```

### Rollback Procedure

If issues occur, disable feature flags immediately:

```env
ENFORCE_SESSION_GATED_CHAT=false
ENFORCE_SESSION_GATED_BILLING=false
DISABLE_LEGACY_APPOINTMENT_TRIGGERS=false
```

No code deployment needed - just restart workers/scheduler.

## Error Codes Reference

| Error Code | HTTP Status | Meaning | Client Action |
|------------|-------------|---------|---------------|
| `SESSION_CONTEXT_REQUIRED` | 400 | Appointment has `session_id`, must use session endpoint | Call `/appointments/{id}/session` to get session context, then use session endpoint |
| `SESSION_NOT_READY` | 403 | Appointment waiting for session to start | Poll `/appointments/{id}/session` until `session_id` is available |
| `SESSION_BILLING_REQUIRED` | 400 | Billing must use session endpoint | Use session completion endpoint instead |

## Session Context Format

### Canonical Format
- Text: `text_session:{id}` (e.g., `text_session:123`)
- Call: `call_session:{id}` (e.g., `call_session:456`)

### Legacy Compatibility
- `text_session_123` → Parsed as `text_session:123`
- `direct_session_*` → Treated as legacy, no billing/chat allowed

## Next Steps

1. ✅ Feature flags implemented
2. ✅ Guardrails enforced
3. ✅ Scheduled commands fixed
4. ⏳ Add automated tests
5. ⏳ Set up monitoring dashboards
6. ⏳ Create runbooks for operations team
7. ⏳ Gradual rollout plan execution
