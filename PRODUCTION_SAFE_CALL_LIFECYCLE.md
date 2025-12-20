# Production-Safe Call Lifecycle Implementation

## Overview

This document describes the production-safe, server-owned call lifecycle system that ensures billing correctness even when queues fail or race conditions occur.

## Key Principles

1. **Server-Owned Lifecycle** - Backend controls all state transitions
2. **Queue Reliability** - Multiple fallback mechanisms ensure promotion happens
3. **Race-Condition Safety** - Handles cases where calls end before promotion completes
4. **Billing Guard** - Billing depends ONLY on timestamps, never WebRTC/frontend state

## Architecture

### State Machine

```
initiated (connecting) → answered → connected → ended
```

**Timestamps:**
- `started_at` - When call is initiated
- `answered_at` - When call is answered (immediate)
- `connected_at` - When call is promoted to connected (5s grace period)
- `ended_at` - When call ends

### Promotion Flow

1. **Call Answered** → `answered_at` set immediately
2. **Queue Job Dispatched** → `PromoteCallToConnected` scheduled for 5 seconds later
3. **Auto-Promotion** → Job runs, sets `connected_at`, status → `active`
4. **Fallback Command** → Scheduled command catches any missed promotions

## Production-Safe Mechanisms

### 1. Queue Reliability

**Primary:** Queue Job
- `PromoteCallToConnected` job dispatched with 5-second delay
- Retries up to 3 times if job fails
- Comprehensive logging at every step

**Fallback:** Scheduled Command
- `calls:promote-missed-connections` runs every minute
- Catches calls that missed the queue job (queue down, job failed, etc.)
- Direct promotion (bypasses queue for reliability)

**Location:** `backend/app/Console/Commands/PromoteMissedCallConnections.php`

### 2. Race-Condition Safety

**Problem:** Call ends after grace period but `connected_at` was never set

**Solution:** Multiple checkpoints fix the race condition:

1. **In Job Handler** (`PromoteCallToConnected`)
   - Checks if call ended but `connected_at` missing
   - Still promotes using `answered_at` as `connected_at`
   - Ensures billing can calculate duration correctly

2. **In End Endpoint** (`CallSessionController::end`)
   - Before calculating billing, checks if `connected_at` missing
   - If `answered_at` exists, fixes race condition immediately
   - Uses `answered_at` as `connected_at` for billing

3. **In Deduction Endpoint** (`CallSessionController::deduction`)
   - Before processing billing, checks if `connected_at` missing
   - If `answered_at` exists, fixes race condition immediately
   - Ensures billing can proceed

4. **In Scheduled Command** (`PromoteMissedCallConnections`)
   - Finds ended calls without `connected_at`
   - Promotes them using `answered_at` as `connected_at`
   - Fixes race conditions retroactively

### 3. Billing Guard

**CRITICAL RULE:** Billing depends ONLY on timestamps:
- `answered_at` - When call was answered
- `connected_at` - When call was connected (billing starts here)
- `ended_at` - When call ended

**Never depends on:**
- ❌ WebRTC connection state
- ❌ Frontend `isConnected` flag
- ❌ Frontend `wasConnected` parameter
- ❌ Any frontend state

**Billing Calculation:**
```php
// Duration = connected_at to ended_at (or now if still active)
$connectedDuration = $callSession->connected_at->diffInSeconds($ended_at ?? now());

// Auto-deductions = floor(duration_minutes / 10)
$autoDeductions = floor($connectedDuration / 60 / 10);

// Manual deduction = +1 if call was connected
$manualDeduction = $callSession->connected_at ? 1 : 0;
```

## Implementation Details

### Job: PromoteCallToConnected

**File:** `backend/app/Jobs/PromoteCallToConnected.php`

**Features:**
- Comprehensive logging at every step
- Race condition detection and fixing
- Idempotent (safe to run multiple times)
- Retries up to 3 times

**Logging:**
- Job execution start
- Call session found/not found
- Current state (status, timestamps)
- Race condition detection
- Promotion success/failure

### Command: PromoteMissedCallConnections

**File:** `backend/app/Console/Commands/PromoteMissedCallConnections.php`

**Scheduled:** Every minute

**Finds:**
1. Answered calls without `connected_at` (more than 5 seconds after `answered_at`)
2. Ended calls without `connected_at` (race condition fix)

**Action:**
- Direct promotion (bypasses queue)
- Uses `answered_at` as `connected_at` if needed
- Comprehensive logging

### Endpoint: CallSessionController::end

**Race Condition Fix:**
```php
if (!$callSession->connected_at && $callSession->answered_at) {
    // Fix race condition: use answered_at as connected_at
    $callSession->update([
        'is_connected' => true,
        'connected_at' => $callSession->answered_at,
    ]);
}
```

### Endpoint: CallSessionController::deduction

**Race Condition Fix:**
```php
if (!$callSession->connected_at && $callSession->answered_at) {
    // Fix race condition before billing
    $callSession->update([
        'is_connected' => true,
        'connected_at' => $callSession->answered_at,
        'status' => CallSession::STATUS_ACTIVE,
    ]);
}
```

## Logging

All critical operations are logged:

1. **Job Execution**
   - Start, attempt number, call session state
   - Race condition detection
   - Promotion success/failure

2. **Scheduled Command**
   - Calls found needing promotion
   - Promotion results
   - Errors

3. **Endpoints**
   - Race condition detection
   - Fixes applied
   - Billing calculations

## Testing Checklist

- [ ] Queue job runs successfully
- [ ] Queue job handles race conditions
- [ ] Scheduled command catches missed promotions
- [ ] End endpoint fixes race conditions
- [ ] Deduction endpoint fixes race conditions
- [ ] Billing only uses timestamps
- [ ] No dependency on WebRTC state
- [ ] No dependency on frontend state

## Production Deployment

1. **Queue Configuration**
   - Ensure `QUEUE_CONNECTION=database` in `.env`
   - Queue workers should be running OR use scheduled command fallback

2. **Scheduled Commands**
   - Verify `calls:promote-missed-connections` is scheduled
   - Runs every minute as fallback

3. **Monitoring**
   - Monitor logs for race condition fixes
   - Alert if many race conditions detected (indicates queue issues)
   - Monitor scheduled command execution

## Summary

The system is now production-safe with:
- ✅ Queue reliability (job + scheduled command fallback)
- ✅ Race condition safety (multiple checkpoints)
- ✅ Billing guard (timestamp-only calculations)
- ✅ Comprehensive logging
- ✅ No frontend dependencies

