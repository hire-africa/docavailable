# Frontend Appointment Logic: Session-Gated Architecture Implementation

## Summary

Implemented session-gated appointment logic where appointments are treated as read-only scheduling data. Only sessions (text_session/call_session) can drive live chat/call features.

## Architecture Decisions Implemented

### 1. Appointments are Not Activatable
- **Removed**: Frontend `startTextAppointmentSession()` function
- **Removed**: Auto-start logic that triggered when appointment time was reached
- **Removed**: Client-side time-based availability checks that gated behavior
- **Result**: Frontend never calls "start appointment session" endpoints or opens sockets using appointment IDs

### 2. Routing Rules (Single Source of Truth = appointment.session_id)

#### 2.1 Appointment Screen Behavior
- **If `appointment.session_id` exists**: Immediately navigate to session context using that identifier
- **If `appointment.session_id` is null**: Show waiting state with optional countdown display

#### 2.2 Countdown Display vs Availability Computation
- **Countdown**: Cosmetic only - shows time-to-appointment for UX
- **Behavior Gating**: Removed - no "if now >= appt_time then start session" logic
- **Decision Source**: Backend data (presence of `session_id`), not device clock

### 3. Data Resolution

#### 3.1 Appointment API Payload
- **Updated**: `GET /appointments/{id}` now includes `session_id` and `appointment_type`
- **Updated**: `GET /chat/{appointmentId}/info` now includes `session_id`
- **Updated**: `GET /appointments` list endpoint includes `session_id` in response (via `toArray()`)

#### 3.2 Lightweight Resolve Endpoint
- **Created**: `GET /appointments/{id}/session` endpoint
  - Returns: `{ appointment_id, session_id, status, appointment_type }`
  - Pure query (no start/activate behavior)
  - Used for polling in waiting state

### 4. Waiting Strategy (Polling)

#### 4.1 Polling Implementation
- **Interval**: 8 seconds (within 5-10s range)
- **Stops when**:
  - `session_id` becomes non-null (navigate to session)
  - Appointment becomes terminal (cancelled/completed)
  - User leaves screen (cleanup on unmount)

#### 4.2 Waiting State UI
- Shows "Waiting for Session" message
- Displays appointment date/time (cosmetic countdown)
- Shows "Checking for session..." indicator
- Prevents any chat/call interaction until session exists

### 5. Preserved Instant Chat/Call UI Flows

#### 5.1 No Changes to Instant Sessions
- `text_session_*` chat routing remains identical
- `direct_session_*` call routing remains identical
- Instant session creation + navigation logic unchanged

#### 5.2 Guardrail: Session-Only Initialization
- Live services (WebRTC, sockets) initialize only when identifier is:
  - `text_session_*` (instant text session)
  - `direct_session_*` (instant call session)
  - `call_session:{id}` (future call session context)
- **Never** when identifier is a plain numeric appointment ID

### 6. Edge Cases Handled

#### 6.1 Appointment Cancelled/Rescheduled
- Waiting screen detects terminal status
- Stops polling
- Shows appropriate state

#### 6.2 Session Exists but Ended
- Session screen handles "ended" state as it does today
- Appointment screen does not attempt to restart it

#### 6.3 Network Offline
- Waiting screen continues retry/backoff
- Does not attempt any session creation
- Polling resumes when network is available

## Files Created

1. **`services/appointmentSessionService.ts`**
   - `resolveAppointmentSession()` - Lightweight session status query
   - `getSessionContextFromAppointment()` - Get session context string
   - `isAppointmentWaiting()` - Check if appointment is waiting
   - `hasAppointmentSession()` - Check if appointment has session

## Files Modified

### Backend
1. **`backend/app/Http/Controllers/Users/AppointmentController.php`**
   - Added `getAppointmentSession()` method
   - Updated `getAppointmentById()` to include `session_id` and `appointment_type`

2. **`backend/app/Http/Controllers/ChatController.php`**
   - Updated `getChatInfo()` to include `session_id` in response

3. **`backend/routes/api.php`**
   - Added route: `GET /appointments/{id}/session`

### Frontend
1. **`app/chat/[appointmentId].tsx`**
   - Removed `startTextAppointmentSession()` function
   - Removed auto-start useEffect that triggered on appointment time
   - Added session-gated routing logic
   - Added waiting state UI
   - Added polling logic (8-second intervals)
   - Updated time checking to be cosmetic only (no behavior gating)
   - Updated `ChatInfo` interface to include `session_id`

2. **`app/my-appointments.tsx`**
   - Updated appointment press handler to navigate to session if `session_id` exists
   - Added "Session Active" indicator for appointments with sessions

3. **`services/appointmentSessionService.ts`** (new)
   - Service for resolving appointment session status

## Key Changes

### Removed Frontend Behaviors
- ❌ `startTextAppointmentSession()` - Frontend no longer starts sessions
- ❌ Auto-start on appointment time - Removed time-based activation
- ❌ Client-side availability computation - No "if now >= appt_time" logic
- ❌ Appointment-based socket connections - Only session contexts allowed

### Added Session-Gated Logic
- ✅ Check `session_id` when loading appointment
- ✅ Navigate to session if `session_id` exists
- ✅ Show waiting state if `session_id` is null
- ✅ Poll backend every 8 seconds for session creation
- ✅ Stop polling when session created or appointment terminal

### Preserved Instant Session Flows
- ✅ `text_session_*` routing unchanged
- ✅ `direct_session_*` routing unchanged
- ✅ Instant session creation unchanged
- ✅ Session-only initialization guardrails in place

## Testing Checklist

- [ ] Appointment without session_id shows waiting state
- [ ] Appointment with session_id navigates to session
- [ ] Polling stops when session is created
- [ ] Polling stops when appointment is cancelled/completed
- [ ] Instant sessions (text_session_*) work unchanged
- [ ] Instant calls (direct_session_*) work unchanged
- [ ] my-appointments navigates to session when session_id exists
- [ ] my-appointments shows appointment details when session_id is null
- [ ] Countdown display works (cosmetic only)
- [ ] No frontend session creation attempts
- [ ] Network offline handling in waiting state

## Safety Guarantees

✅ **No Frontend Activation**: Frontend never calls session creation endpoints  
✅ **Session-Gated**: Only sessions can drive live features  
✅ **Backend Authority**: Session creation decisions come from backend only  
✅ **Instant Sessions Unchanged**: Talk Now flows remain identical  
✅ **Read-Only Appointments**: Appointments are scheduling data only  

## Notes

- All changes maintain backward compatibility
- Instant session flows are completely unaffected
- Waiting state is non-blocking (user can navigate away)
- Polling is efficient (lightweight endpoint, 8s intervals)
- Countdown is purely cosmetic (no behavior impact)
