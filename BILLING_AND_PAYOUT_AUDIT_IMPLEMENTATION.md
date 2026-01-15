# Billing + Doctor Payout Audit: Architecture Safeguards Implementation

## Summary

Added non-breaking comments, safeguards, and documentation to identify and mark legacy appointment-based billing paths, while ensuring new code follows session-based billing patterns.

## Architecture Decisions Implemented

### 1. Target Invariant: Billing Triggered Only by Session Events

**Decision**: Billing and doctor earnings must be triggered only by session lifecycle events:
- **Text**: session activated, session ended, periodic 10-minute auto-deductions while active
- **Call**: call connected (`connected_at`), periodic deductions by duration, manual hangup deduction
- **Not Allowed**: Billing based purely on an appointment timestamp (e.g., "appointment started so deduct")

### 2. Findings: Call Billing is Session-Event-Driven (Good) ✅

**Confirmed**: Call billing is calculated from `connected_at`, not appointment time. Both the call end flow and call deduction flow explicitly guard billing by requiring `connected_at` (or a race-condition fix from `answered_at`). Doctor payouts are credited via `DoctorWallet->credit()` in the same flows that deduct patient sessions.

**Decision**: Treat this as compliant with "billing triggered by call connected/duration/session end".

#### 2.1 Identifier Naming Overload (appointment_id)

**Finding**: The call session model uses `call_sessions.appointment_id` as the primary routing identifier (including `direct_session_*`). This is not inherently wrong, but it creates semantic risk: "appointment_id" looks like an appointment, but is used as a call session key.

**Decision**: Added safeguards/comments stating:
- "appointment_id here is a session routing key, not necessarily a DB appointment row."
- Added to `CallSession` model and migration file

### 3. Findings: Text Session Billing is Session-Event-Driven (Good) ✅

**Confirmed**:
- Text session auto-deductions: Scheduled command processes auto-deductions only for active text sessions, uses service that locks `text_sessions` row, checks `auto_deductions_processed`, deducts from subscription, credits doctor wallet.
- Session end processing: `processSessionEnd(TextSession $session)` pays the doctor and deducts the patient based on session-derived calculations.

**Decision**: This is compliant - payouts and deductions come from session completion/end.

### 4. High-Risk Finding: Appointment-Based Billing/Payout Paths Exist (Legacy) ⚠️

**Identified Legacy Paths**:

#### 4.1 `DoctorPaymentService::processAppointmentPayment()` / `processAppointmentEnd()`
- **Location**: `backend/app/Services/DoctorPaymentService.php`
- **Issue**: Credits doctor wallet based on an Appointment record (not a session record)
- **Violation**: Directly violates target invariant "payouts only from completed sessions"
- **Action**: Added legacy markers and deprecation notices

#### 4.2 `Users/AppointmentController@processPayment`
- **Location**: `backend/app/Http/Controllers/Users/AppointmentController.php`
- **Issue**: Deducts from patient subscription and awards doctor earnings directly from the appointment
- **Violation**: Explicit appointment-based trigger
- **Action**: Added legacy markers and TODO guardrails

#### 4.3 `ProcessMissedPayments` command processes appointments
- **Location**: `backend/app/Console/Commands/ProcessMissedPayments.php`
- **Issue**: Finds completed appointments without wallet transactions and then runs `processAppointmentEnd($appointment)`
- **Violation**: Appointment-based billing path
- **Action**: Added legacy markers and TODO guardrails

#### 4.4 `TextAppointmentController::processDeduction()`
- **Location**: `backend/app/Http/Controllers/TextAppointmentController.php`
- **Issue**: Deducts subscription based on `appointment_id`, credits doctor wallet, references `text_appointment_sessions` keyed by `appointment_id`
- **Violation**: Appointment-derived billing path
- **Action**: Added legacy markers and TODO guardrails

#### 4.5 `ProcessAppointmentSessions` command
- **Location**: `backend/app/Console/Commands/ProcessAppointmentSessions.php`
- **Issue**: Checks appointment time windows for missed/cancel logic and calls billing/payout
- **Violation**: Appointment-time-based trigger
- **Action**: Added legacy markers and TODO guardrails

#### 4.6 `Users/AppointmentController@endSession`
- **Location**: `backend/app/Http/Controllers/Users/AppointmentController.php`
- **Issue**: Calls `processAppointmentEnd()` when ending appointment
- **Violation**: Appointment-based billing trigger
- **Action**: Added legacy markers and TODO guardrails

### 5. Non-Breaking Safeguards Added

#### 5.1 Explicit Legacy Marker Documentation
- **Action**: Marked all appointment-based payment functions as legacy and intended to be replaced by session-based billing once `appointments.session_id` is live
- **Files Modified**:
  - `DoctorPaymentService::processAppointmentPayment()` - Added deprecation notice
  - `DoctorPaymentService::processAppointmentEnd()` - Added deprecation notice
  - `DoctorPaymentService::deductFromPatientSubscriptionForAppointment()` - Added deprecation notice
  - `AppointmentController::processPayment()` - Added deprecation notice
  - `AppointmentController::endSession()` - Added legacy marker
  - `TextAppointmentController::processDeduction()` - Added deprecation notice
  - `ProcessMissedPayments::processAppointments()` - Added legacy marker
  - `ProcessAppointmentSessions::handle()` - Added legacy marker

#### 5.2 Session-First Guardrails (TODO Comments)
- **Action**: Added TODO comments in all legacy functions stating:
  - Check `appointment.session_id` first
  - If `session_id` exists, defer to session-based billing
  - Only fall back to legacy appointment billing if `session_id` is null (during transition)
- **Implementation**: These are non-breaking - they don't change current behavior, but guide future migration

#### 5.3 Prevent Appointment-Time-Based Triggers
- **Action**: Added documentation in `ProcessAppointmentSessions` command stating:
  - Commands should not call billing/payout unless explicitly part of legacy appointment billing
  - Must migrate to session-based evaluation later
  - Added TODO to filter appointments without `session_id` once migration is complete

#### 5.4 Call Session Identifier Documentation
- **Action**: Added comments to `CallSession` model and migration file clarifying:
  - `appointment_id` is a session routing key, not necessarily a DB appointment row
  - For instant calls, it's `direct_session_{timestamp}`
  - For scheduled calls, it may reference `appointments.id`, but billing is still session-event-driven

## Files Modified

### Backend Services
1. **`backend/app/Services/DoctorPaymentService.php`**
   - Added legacy markers to `processAppointmentPayment()`
   - Added legacy markers to `processAppointmentEnd()`
   - Added legacy markers to `deductFromPatientSubscriptionForAppointment()`

### Backend Controllers
2. **`backend/app/Http/Controllers/Users/AppointmentController.php`**
   - Added legacy markers to `processPayment()`
   - Added legacy markers to `endSession()`

3. **`backend/app/Http/Controllers/TextAppointmentController.php`**
   - Added legacy markers to `processDeduction()`

### Backend Commands
4. **`backend/app/Console/Commands/ProcessMissedPayments.php`**
   - Added legacy markers to `processAppointments()`

5. **`backend/app/Console/Commands/ProcessAppointmentSessions.php`**
   - Added legacy markers to `handle()`

### Backend Models
6. **`backend/app/Models/CallSession.php`**
   - Added semantic note about `appointment_id` being a routing key

### Backend Migrations
7. **`backend/database/migrations/2025_09_29_000001_create_call_sessions_table.php`**
   - Added semantic note about `appointment_id` being a routing key

## Migration Path Defined

### Phase 1: Current State (Legacy + Session-Based Coexistence)
- Appointment-based billing paths remain callable for backward compatibility
- Session-based billing paths are the target authority for new sessions
- Legacy paths marked with deprecation notices

### Phase 2: Transition (Once `appointments.session_id` is Populated)
- New appointments with `session_id` should use session-based billing only
- Legacy appointments without `session_id` can still use appointment-based billing
- Guardrails (TODO comments) guide developers to check `session_id` first

### Phase 3: Full Migration (Future)
- All appointments have `session_id`
- Appointment-based billing paths become fallback-only
- Eventually remove appointment-based billing paths entirely

## Safety Guarantees

✅ **No Behavior Changes**: All changes are comments/documentation only  
✅ **Backward Compatible**: Legacy paths remain callable  
✅ **Clear Migration Path**: TODO comments guide future migration  
✅ **Session-First Guardrails**: New code should check `session_id` first  
✅ **Call Billing Compliant**: Confirmed session-event-driven  
✅ **Text Billing Compliant**: Confirmed session-event-driven  
⚠️ **Legacy Paths Identified**: All appointment-based billing paths clearly marked  

## Notes

- All changes are non-breaking (comments/documentation only)
- Legacy paths remain functional for backward compatibility
- Migration path is clearly defined in TODO comments
- Call and text session billing are confirmed compliant with target invariant
- Appointment-based billing paths are explicitly marked as legacy and deprecated
