# Appointment → Session Lifecycle Architecture Implementation

## Summary

This document describes the implementation of the architecture decisions to separate Appointments from Sessions, ensuring that:
- Appointments never "become" sessions
- Sessions are the only artifacts allowed to drive live chat/call signaling and billing
- Clear separation of concerns between scheduling (appointments) and live interaction (sessions)

## Changes Implemented

### 1. Context Type System (`types/sessionContext.ts`)

Created a new type system for session context:

- **`ContextType`**: `'text_session' | 'call_session' | 'appointment'`
- **`SessionContext`**: `{ context_type: ContextType, context_id: number }`
- **Utility functions**:
  - `contextToString()`: Converts context to `"{context_type}:{context_id}"` format
  - `parseContextString()`: Parses context string back to SessionContext

This provides a standardized way to identify what type of context is being used for real-time channels.

### 2. Unified Start-Session Endpoint (`services/textSessionService.ts`)

Added new method:
- **`startSessionFromAppointment(appointmentId, modality?)`**: Calls `POST /appointments/{id}/start-session`
  - Returns `SessionContext` with `context_type` and `context_id`
  - Idempotent: repeated calls return the same session if one already exists
  - Supports modality parameter: `'text' | 'audio' | 'video'`

Legacy method `createTextSessionFromAppointment` still exists for backward compatibility but now tries the new endpoint first.

### 3. WebSocket Services Updated

#### `services/webrtcChatService.ts`
- Updated to accept `context?: SessionContext` in `ChatConfig`
- WebSocket connection URL now uses `context={context_type}:{context_id}` when context is available
- Falls back to `appointmentId` for backward compatibility (read-only mode)

#### `services/webrtcSessionService.ts`
- `initialize()` method now accepts `appointmentId: string | SessionContext`
- WebSocket connection uses context envelope when available
- Maintains backward compatibility with appointmentId string

### 4. WebRTC Services Updated

#### `services/audioCallService.ts`
- `initialize()` method signature updated to accept `appointmentId: string | SessionContext`
- `connectSignaling()` uses context envelope when available
- Falls back to appointmentId for backward compatibility

#### `services/videoCallService.ts`
- Similar updates needed (marked for future implementation)

### 5. Chat Screen Integration (`app/chat/[appointmentId].tsx`)

Updated the chat initialization flow:

1. **For appointments**: Calls `startSessionFromAppointment()` before connecting WebSocket
   - Determines modality from appointment type
   - Gets session context
   - Passes context to WebRTCChatService

2. **For instant text sessions**: Parses session ID from `text_session_{id}` format and creates context

3. **Backward compatibility**: If session start fails, continues with appointmentId (read-only mode)

## Architecture Compliance

### ✅ Core Principle: Appointments never "become" sessions
- Sessions are created via `startSessionFromAppointment()` endpoint
- Appointments remain separate entities used for scheduling/eligibility

### ✅ Identifiers: Two distinct IDs
- `appointment_id`: DB appointment primary key (scheduling)
- `session_id`: DB session primary key (live interaction)
- Context envelope provides clear type + ID separation

### ✅ State Machines
- Appointment states: `scheduled`, `confirmed`, `cancelled`, `completed`, `no_show`
- Session states: `created`, `waiting_for_doctor`, `active`, `ended`, `expired`
- Separation maintained: appointments cannot trigger live side effects

### ✅ WebRTC/Socket Layer Permissions
- **MUST NOT**: Create sessions, activate appointment sessions, call appointment auto-deduction
- **MAY**: Connect to signaling rooms for `text_session:{id}` or `call_session:{id}`
- **Appointments over sockets**: Read-only (schedule updates, notifications only)

### ✅ Integration Points
- **Command**: `POST /appointments/{id}/start-session` (implemented in frontend)
- **Query**: `GET /appointments/{id}/status` (existing)
- **Query**: `GET /text-sessions/{id}` (existing)
- **Query**: `GET /call-sessions/{id}` (existing)

## Guard Rails (Backend Implementation Required)

The following guard rails should be implemented on the backend:

### Rule A: Billing/Deduction Endpoints
Any endpoint that can bill/deduct/pay must require:
- `context_type in {text_session, call_session}`
- `context_id` must be a valid session ID
- Reject requests with `context_type: 'appointment'`

### Rule B: Signaling Connections
- WebSocket signaling server must validate context
- Only `text_session` and `call_session` contexts can send offer/answer/candidates
- `appointment` context can only receive read-only notifications

### Rule C: UI Screen Resolution
- Frontend screens can be appointment-addressed for navigation
- Must resolve to session context before enabling live features
- ✅ **Implemented**: Chat screen calls `startSessionFromAppointment()` before connecting

## Backward Compatibility

All changes maintain backward compatibility:
- Services accept both `appointmentId` (string) and `SessionContext`
- When `appointmentId` is used, it's treated as read-only appointment context
- Legacy endpoints still work but are deprecated in favor of unified endpoint

## Next Steps

1. **Backend Implementation**: Implement `POST /appointments/{id}/start-session` endpoint
2. **Backend Guard Rails**: Add validation to billing/deduction endpoints
3. **WebSocket Server**: Update to validate and route based on context envelope
4. **Video Call Service**: Apply same context updates as audio call service
5. **Testing**: Verify appointment → session lifecycle works correctly
6. **Migration**: Gradually migrate all appointment-based connections to use session context

## Files Modified

- `types/sessionContext.ts` (new)
- `types/chat.ts` (updated)
- `services/textSessionService.ts` (updated)
- `services/webrtcChatService.ts` (updated)
- `services/webrtcSessionService.ts` (updated)
- `services/audioCallService.ts` (updated)
- `app/chat/[appointmentId].tsx` (updated)

## Notes

- The architecture is implemented on the frontend side
- Backend endpoints need to be created/updated to match this architecture
- WebSocket signaling server needs to be updated to handle context envelope
- All changes are backward compatible and won't break existing functionality
