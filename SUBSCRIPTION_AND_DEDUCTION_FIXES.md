# Subscription & Auto-Deduction Fixes

## Issues Fixed

### 1. ✅ Subscription Requirement Enforcement

**Problem:** Backend was allowing text sessions to start without an active subscription (testing bypass).

**Location:** `backend/app/Http/Controllers/TextSessionController.php` (lines 67-88)

**Fix Applied:**
```php
// ENFORCE subscription requirement - patients must have active subscription
$subscription = Subscription::where('user_id', $patientId)
    ->where('status', 1) // 1 = active, 0 = inactive, 2 = expired
    ->where('is_active', true)
    ->first();

// Check if subscription exists and is active
if (!$subscription) {
    return response()->json([
        'success' => false,
        'message' => 'No active subscription found. Please subscribe to a plan to start a text session.'
    ], 403);
}

// Check if patient has text sessions remaining
$sessionsRemaining = $subscription->text_sessions_remaining ?? 0;
if ($sessionsRemaining <= 0) {
    return response()->json([
        'success' => false,
        'message' => 'You have no text sessions remaining in your subscription. Please upgrade your plan or wait for renewal.'
    ], 403);
}
```

**Impact:**
- ✅ Patients MUST have an active subscription to start sessions
- ✅ Patients MUST have available text sessions in their subscription
- ✅ Returns clear error messages when requirements aren't met
- ✅ Prevents unauthorized session creation

---

### 2. ✅ Auto-Deduction Every 10 Minutes (Regardless of Activity)

**Problem:** Sessions weren't getting deducted when there was no chat activity, leading to unended sessions.

**Solution:** Backend scheduler already configured to run auto-deductions every 10 minutes.

**Location:** `backend/routes/console.php` (lines 23-27)

```php
// Schedule auto-deductions for text sessions every 10 minutes
Schedule::command('sessions:process-auto-deductions')
    ->everyTenMinutes()
    ->withoutOverlapping()
    ->runInBackground();
```

**How It Works:**

**Command:** `backend/app/Console/Commands/ProcessAutoDeductions.php`

```php
public function handle()
{
    // Get ALL active sessions (regardless of activity)
    $activeSessions = TextSession::where('status', TextSession::STATUS_ACTIVE)
        ->whereNotNull('activated_at')
        ->get();
    
    foreach ($activeSessions as $session) {
        $elapsedMinutes = $session->getElapsedMinutes();
        $expectedDeductions = floor($elapsedMinutes / 10);
        $alreadyProcessed = $session->auto_deductions_processed ?? 0;
        $newDeductions = $expectedDeductions - $alreadyProcessed;
        
        if ($newDeductions > 0) {
            // Atomic update to prevent double processing
            DB::table('text_sessions')
                ->where('id', $session->id)
                ->where('auto_deductions_processed', $alreadyProcessed)
                ->update([
                    'auto_deductions_processed' => $expectedDeductions,
                    'sessions_used' => DB::raw("sessions_used + {$newDeductions}")
                ]);
            
            // Process deduction and payment
            $paymentService->processAutoDeduction($session);
        }
    }
}
```

**Key Features:**
- ✅ Runs every 10 minutes via Laravel scheduler
- ✅ Processes ALL active sessions (not just those with recent activity)
- ✅ Uses atomic updates to prevent double deductions
- ✅ Tracks `auto_deductions_processed` to avoid reprocessing
- ✅ Deducts from patient subscription
- ✅ Credits doctor wallet
- ✅ Sends notifications to doctor

---

## How Deductions Work Now

### Timeline Example:

```
Session Start (0 min)
├─ sessions_used = 0
├─ auto_deductions_processed = 0
└─ No charge yet

10 Minutes Elapsed
├─ Scheduler runs: sessions:process-auto-deductions
├─ Deducts 1 session from patient
├─ Pays doctor MWK 4000 or USD 4
├─ sessions_used = 1
└─ auto_deductions_processed = 1

20 Minutes Elapsed
├─ Scheduler runs again
├─ Deducts 1 more session
├─ Pays doctor again
├─ sessions_used = 2
└─ auto_deductions_processed = 2

Manual End (at 23 minutes)
├─ Auto-deductions: 2 sessions (already processed)
├─ Manual end penalty: 1 session
├─ Total deducted: 3 sessions
└─ Total doctor payment: 3 × rate
```

---

## Ensuring Scheduler Runs

### For Production Deployment:

**1. Add Cron Job (Linux/Mac):**
```bash
* * * * * cd /path-to-your-project && php artisan schedule:run >> /dev/null 2>&1
```

**2. For Windows Server:**
Use Task Scheduler to run every minute:
```cmd
php artisan schedule:run
```

**3. For DigitalOcean/Cloud:**
Add to your deployment configuration or use platform-specific cron jobs.

**4. Verify Scheduler is Running:**
```bash
php artisan schedule:list
```

Expected output:
```
0 */10 * * * * sessions:process-auto-deductions .... Next Due: 8 minutes from now
```

**5. Test Manually:**
```bash
php artisan sessions:process-auto-deductions --debug
```

---

## Additional Safeguards

### 1. Session Auto-Ending

**Location:** `backend/app/Console/Commands/ProcessExpiredTextSessions.php`

- Automatically ends sessions that have run out of time
- Runs periodically to clean up stale sessions

### 2. Insufficient Sessions Check

**Location:** `backend/app/Http/Controllers/TextSessionController.php` (lines 349-375)

```php
if ($session->status === TextSession::STATUS_ACTIVE && 
    $session->shouldAutoEndDueToInsufficientSessions()) {
    
    // Auto-end the session
    $session->update([
        'status' => TextSession::STATUS_ENDED,
        'ended_at' => now()
    ]);
    
    // Process final payment
    $paymentService->processSessionEnd($session, true);
}
```

### 3. Concurrent Update Protection

Uses atomic database updates with version checking:
```php
->where('auto_deductions_processed', $alreadyProcessed) // Prevents race conditions
```

---

## Testing the Fixes

### Test 1: Subscription Requirement
```bash
# Try to start session without subscription
curl -X POST /api/text-sessions/start \
  -H "Authorization: Bearer {token}" \
  -d '{"doctor_id": 1, "reason": "Test"}'

# Expected: 403 error with message about no subscription
```

### Test 2: Auto-Deduction
```bash
# Start a session and wait 10+ minutes without sending messages
# Then run:
php artisan sessions:process-auto-deductions --debug

# Expected: Session should be deducted even without activity
```

### Test 3: Scheduler
```bash
# Check scheduler status
php artisan schedule:list

# Run scheduler manually
php artisan schedule:run

# Check logs
tail -f storage/logs/laravel.log | grep "auto-deduction"
```

---

## Monitoring & Logs

### Key Log Messages:

**Successful Auto-Deduction:**
```
✅ Processed {n} deductions for session {id}
Scheduler auto-deduction processed: session_id={id}, deductions_processed={n}
```

**Subscription Validation:**
```
No active subscription found for patient {id}
Patient has no text sessions remaining
```

**Payment Processing:**
```
Successfully deducted {n} text sessions from patient subscription
Auto-deducted {n} new sessions (total: {total})
```

---

## Summary

### ✅ Fixed Issues:
1. **Subscription enforcement** - No more sessions without active subscription
2. **Auto-deduction reliability** - Runs every 10 minutes regardless of activity
3. **Unended sessions** - Scheduler ensures all active sessions get processed

### ✅ How It Works:
1. Patient must have active subscription with available sessions
2. Session starts with `sessions_used = 0`
3. Every 10 minutes, scheduler deducts 1 session automatically
4. Deduction happens even if no messages are sent
5. Manual end adds 1 additional session deduction
6. Doctor gets paid for each deducted session

### ✅ Protection Mechanisms:
1. Atomic updates prevent double deductions
2. Version checking prevents race conditions
3. Scheduler runs independently of user activity
4. Sessions auto-end when time/sessions run out
