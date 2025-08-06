# Session Deduction System

## Overview

The session deduction system implements a fair billing mechanism where sessions are deducted based on actual usage time, with automatic deductions every 10 minutes and manual end deductions.

## Session Deduction Rules

### **Auto-Deductions**
- **Every 10 minutes**: Automatically deducts 1 session
- **Timing**: 10, 20, 30, 40, 50, 60 minutes, etc.
- **Example**: At 10 minutes = 1 session, at 20 minutes = 2 sessions, at 30 minutes = 3 sessions

### **Manual End Deductions**
- **Always deducts 1 session**: Regardless of when the session ends
- **Additional to auto-deductions**: Manual end always adds 1 session to the total

### **Total Session Deduction Formula**
```
Total Sessions = Auto-Deductions + Manual End Deduction
Auto-Deductions = floor(elapsed_minutes / 10)
Manual End Deduction = 1 (if manual end)
```

## Examples

### **Example 1: 8-minute session**
- Elapsed time: 8 minutes
- Auto-deductions: floor(8/10) = 0
- Manual end: 1
- **Total: 1 session deducted**

### **Example 2: 12-minute session**
- Elapsed time: 12 minutes
- Auto-deductions: floor(12/10) = 1
- Manual end: 1
- **Total: 2 sessions deducted**

### **Example 3: 25-minute session**
- Elapsed time: 25 minutes
- Auto-deductions: floor(25/10) = 2
- Manual end: 1
- **Total: 3 sessions deducted**

### **Example 4: 35-minute session**
- Elapsed time: 35 minutes
- Auto-deductions: floor(35/10) = 3
- Manual end: 1
- **Total: 4 sessions deducted**

## Implementation Details

### **Backend (Laravel)**

#### **TextSession Model Methods**
```php
// Calculate sessions to deduct
public function getSessionsToDeduct(bool $isManualEnd = false): int
{
    $elapsedMinutes = $this->getElapsedMinutes();
    $autoDeductions = floor($elapsedMinutes / 10);
    $manualDeduction = $isManualEnd ? 1 : 0;
    return $autoDeductions + $manualDeduction;
}

// Get elapsed minutes
public function getElapsedMinutes(): int
{
    if (!$this->started_at) return 0;
    $endTime = $this->ended_at ?? now();
    return $this->started_at->diffInMinutes($endTime);
}

// Check if should auto-end
public function shouldAutoEnd(): bool
{
    $elapsedMinutes = $this->getElapsedMinutes();
    $totalAllowedMinutes = $this->getTotalAllowedMinutes();
    return $elapsedMinutes >= $totalAllowedMinutes;
}
```

#### **DoctorPaymentService**
```php
// Process session end with deduction calculation
public function processSessionEnd(TextSession $session, bool $isManualEnd = true): array
{
    $sessionsToDeduct = $session->getSessionsToDeduct($isManualEnd);
    // Process payment and deduction...
}

// Process auto-deductions during active sessions
public function processAutoDeduction(TextSession $session): bool
{
    $elapsedMinutes = $session->getElapsedMinutes();
    $autoDeductions = floor($elapsedMinutes / 10);
    // Process auto-deduction...
}
```

### **Frontend (TypeScript)**

#### **SessionService**
```typescript
// Calculate sessions to deduct
calculateSessionsToDeduct(elapsedMinutes: number, isManualEnd: boolean = false): number {
  const autoDeductions = Math.floor(elapsedMinutes / 10);
  const manualDeduction = isManualEnd ? 1 : 0;
  return autoDeductions + manualDeduction;
}

// Get session billing info
getSessionBillingInfo(elapsedMinutes: number, isManualEnd: boolean = false) {
  const autoDeductions = Math.floor(elapsedMinutes / 10);
  const manualDeduction = isManualEnd ? 1 : 0;
  const totalDeductions = autoDeductions + manualDeduction;
  
  return {
    autoDeductions,
    manualDeduction,
    totalDeductions,
    timeUntilNextDeduction: this.getTimeUntilNextDeduction(elapsedMinutes),
    elapsedMinutes
  };
}
```

### **Firebase Functions**

#### **Auto-Deduction Logic**
```typescript
// Calculate sessions to deduct
const elapsedMinutes = Math.floor(durationMs / (60 * 1000));
const autoDeductions = Math.floor(elapsedMinutes / 10);
const manualDeduction = 1; // Manual end always adds 1
const totalSessionsToDeduct = autoDeductions + manualDeduction;

// Process deduction
await admin.firestore().collection('users').doc(patientId).update({
  sessionCount: admin.firestore.FieldValue.increment(-totalSessionsToDeduct)
});
```

## Commands

### **Process Auto-Deductions**
```bash
php artisan sessions:process-auto-deductions
```
This command processes auto-deductions for active sessions every 10 minutes.

## Testing

### **Run Tests**
```bash
php artisan test --filter=SessionDeductionTest
```

### **Test Scenarios**
1. **8-minute session**: 1 session deducted (manual only)
2. **12-minute session**: 2 sessions deducted (1 auto + 1 manual)
3. **25-minute session**: 3 sessions deducted (2 auto + 1 manual)
4. **35-minute session**: 4 sessions deducted (3 auto + 1 manual)

## Monitoring

### **Logs**
- Auto-deductions are logged with session ID and deduction count
- Manual end deductions are logged with session details
- Errors are logged with full context

### **Database Fields**
- `sessions_deducted`: Total sessions deducted
- `auto_deductions`: Number of auto-deductions
- `manual_deduction`: Manual end deduction (always 1)
- `elapsed_minutes`: Total session duration

## Configuration

### **Environment Variables**
- `SESSION_AUTO_DEDUCTION_INTERVAL`: 10 minutes (default)
- `SESSION_MAX_DURATION`: Based on sessions remaining × 10 minutes

### **Scheduling**
Auto-deductions are processed every 5 minutes via Firebase Functions and Laravel commands. 