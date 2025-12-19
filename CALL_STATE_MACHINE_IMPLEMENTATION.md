# Call State Machine & Billing Implementation

## Overview

This document describes the strict call state machine and server-side billing implementation that ensures:
- Calls only transition to "connected" when WebRTC peer connection state becomes 'connected'
- Billing only starts after `connected_at` timestamp is set
- All billing calculations are done server-side using DB timestamps
- Billing is safe even if server crashes (all data in DB)

## Call State Machine

### State Transitions

```
initiated → ringing → connected → ended
```

**State Details:**

1. **initiated** (`status: 'connecting'`)
   - When: Call session is created via `/api/call-sessions/start`
   - DB: `status = 'connecting'`, `started_at = now()`, `is_connected = false`, `connected_at = NULL`
   - No billing

2. **ringing** (`status: 'answered'`)
   - When: Doctor answers the call via `/api/call-sessions/answer`
   - DB: `status = 'answered'`, `answered_at = now()`, `answered_by = user_id`
   - No billing yet

3. **connected** (`status: 'active'`)
   - When: **WebRTC peer connection state becomes 'connected'**
   - DB: `status = 'active'`, `is_connected = true`, `connected_at = now()`
   - **Billing starts here**

4. **ended** (`status: 'ended'`)
   - When: Call ends via `/api/call-sessions/end`
   - DB: `status = 'ended'`, `ended_at = now()`
   - Final billing calculation

## WebRTC Event Hook

### Exact Event to Hook Into

**Event:** `peerConnection.addEventListener('connectionstatechange')`

**Location:**
- `services/audioCallService.ts` (line ~785)
- `services/videoCallService.ts` (line ~357, ~581)

**Code:**
```typescript
this.peerConnection.addEventListener('connectionstatechange', () => {
  const state = this.peerConnection?.connectionState;
  
  if (state === 'connected') {
    // CRITICAL: This is the ONLY place where connected_at is set
    // Call backend API to update DB
    await this.markConnectedOnce(); // Audio
    // OR
    await this.markConnectedInBackend(); // Video
  }
});
```

**Backend API Call:**
```typescript
POST /api/call-sessions/mark-connected
{
  "appointment_id": "...",
  "call_type": "voice" | "video"
}
```

## Server-Side Billing Logic

### Database Schema

**New Field:**
- `connected_at` (timestamp, nullable) - Set ONLY when WebRTC becomes connected

### Billing Calculation (Server-Side Only)

**Location:** `backend/app/Http/Controllers/CallSessionController.php`

#### 1. Auto-Deductions (Every 10 Minutes)

```php
// Calculate duration from connected_at (NOT started_at)
$connectedDuration = $callSession->connected_at->diffInSeconds(now());
$elapsedMinutes = floor($sessionDuration / 60);
$autoDeductions = floor($elapsedMinutes / 10); // 1 session per 10 minutes
```

#### 2. Manual End Deduction (+1 Session)

```php
// Always add +1 session on manual hang up (if call was connected)
$manualDeduction = $wasConnected ? 1 : 0;
$totalSessionsToDeduct = $remainingAutoDeductions + $manualDeduction;
```

#### 3. Total Billing Formula

```
Total Sessions = Auto-Deductions + Manual End Deduction
Auto-Deductions = floor(connected_duration_minutes / 10)
Manual End Deduction = 1 (if call was connected)
```

### Billing Safety Rules

1. **Never bill if `connected_at` is NULL**
   - If call never connected, return early with 0 sessions deducted

2. **Calculate from `connected_at`, not `started_at`**
   - Only bill for actual connected time

3. **Server-side validation**
   - Validate `session_duration` against server-side `connected_at` timestamp
   - Cap suspicious durations (allow 60s buffer for network latency)

4. **Idempotent operations**
   - Use `lockForUpdate()` to prevent race conditions
   - Track `auto_deductions_processed` to prevent double-billing

## DB Updates for Each Transition

### 1. Call Initiated (`/api/call-sessions/start`)

```php
CallSession::create([
    'status' => 'connecting',
    'started_at' => now(),
    'is_connected' => false,
    'connected_at' => null, // NULL until WebRTC connects
    'sessions_used' => 0,
]);
```

### 2. Call Answered (`/api/call-sessions/answer`)

```php
$callSession->update([
    'status' => 'answered',
    'answered_at' => now(),
    'answered_by' => $user->id,
    // connected_at still NULL
]);
```

### 3. Call Connected (`/api/call-sessions/mark-connected`)

```php
// CRITICAL: Only called when WebRTC peer connection state = 'connected'
$callSession->markAsConnected(); // Sets:
// - status = 'active'
// - is_connected = true
// - connected_at = now() ← BILLING STARTS HERE
```

### 4. Call Ended (`/api/call-sessions/end`)

```php
// Calculate billing from connected_at
if (!$callSession->connected_at) {
    // Never connected - no billing
    return; // 0 sessions deducted
}

$connectedDuration = $callSession->connected_at->diffInSeconds(now());
$autoDeductions = floor($elapsedMinutes / 10);
$manualDeduction = $wasConnected ? 1 : 0;
$totalSessionsToDeduct = $autoDeductions + $manualDeduction;

$callSession->update([
    'status' => 'ended',
    'ended_at' => now(),
    'sessions_used' => $totalSessionsToDeduct,
]);
```

## Background Billing

**Location:** `services/backgroundBillingManager.ts`

**Key Points:**
- Started when UI detects `connectionState === 'connected'`
- Backend API call to `mark-connected` happens BEFORE billing starts
- Backend verifies `connected_at` exists before processing any billing
- Billing cycles every 10 minutes via `/api/call-sessions/deduction`

## Money Safety Rules

### ✅ DO:
- Write all timestamps to DB immediately
- Calculate billing from DB timestamps (server-side)
- Use database transactions with locks
- Validate durations against server-side timestamps

### ❌ NEVER:
- Do billing on frontend
- Rely on sockets alone for billing
- Use unreliable RTC events for billing
- Calculate billing from `started_at` (use `connected_at`)

## Mental Model

1. **Calls are a state machine** - Strict transitions, DB-driven
2. **Billing is a math problem on timestamps** - Server-side calculation from `connected_at`
3. **UI events are irrelevant** - Only WebRTC `connectionstatechange` event matters for `connected_at`

## Files Modified

### Backend:
- `backend/database/migrations/2025_01_15_000001_add_connected_at_to_call_sessions_table.php` (NEW)
- `backend/app/Models/CallSession.php` - Added `connected_at` field
- `backend/app/Http/Controllers/CallSessionController.php` - Added `markConnected()` endpoint, updated billing logic
- `backend/routes/api.php` - Added `/call-sessions/mark-connected` route

### Frontend:
- `services/audioCallService.ts` - Updated `markConnectedOnce()` to call backend API
- `services/videoCallService.ts` - Added `markConnectedInBackend()` method
- `services/backgroundBillingManager.ts` - Added comments about billing safety

## Testing Checklist

- [ ] Call that never connects → 0 sessions deducted
- [ ] Call connects → `connected_at` is set
- [ ] Billing starts only after `connected_at` is set
- [ ] 10-minute auto-deductions work correctly
- [ ] Manual hang up adds +1 session
- [ ] Server crash → billing still correct (from DB timestamps)
- [ ] Multiple connection attempts → only first `connected_at` is set (idempotent)

