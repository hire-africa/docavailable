# 🕐 Scheduler-Based Auto-Deduction System

## 📋 Overview

This system uses Laravel's built-in scheduler to automatically deduct text sessions every 10 minutes from the activation time. It's simple, reliable, and doesn't require queue workers.

## 🔧 How It Works

### **1. Session Activation**
When a doctor sends the first message in a text session:
```php
$session->activate(); // Sets status to 'active' and activated_at timestamp
```

### **2. Scheduler Processing**
Every 10 minutes, the scheduler runs:
```php
Schedule::command('sessions:process-auto-deductions')
    ->everyTenMinutes()
    ->withoutOverlapping()
    ->runInBackground();
```

### **3. Auto-Deduction Logic**
The command processes all active sessions:
- Calculates elapsed minutes since activation
- Determines expected deductions (floor(elapsed_minutes / 10))
- Only processes new deductions (prevents double processing)
- Uses atomic updates for safety

## 🚀 Key Features

### **✅ Atomic Operations**
```php
// Prevents double processing
$updated = DB::table('text_sessions')
    ->where('id', $session->id)
    ->where('status', TextSession::STATUS_ACTIVE)
    ->where('auto_deductions_processed', $alreadyProcessed)
    ->update([
        'auto_deductions_processed' => $expectedDeductions,
        'sessions_used' => DB::raw("sessions_used + {$newDeductions}")
    ]);
```

### **✅ Smart Deduction Tracking**
- Tracks `auto_deductions_processed` to prevent double deductions
- Only processes new deductions since last run
- Handles missed deductions automatically

### **✅ Comprehensive Logging**
```php
Log::info("Scheduler auto-deduction processed", [
    'session_id' => $session->id,
    'elapsed_minutes' => $elapsedMinutes,
    'deductions_processed' => $newDeductions,
    'total_deductions' => $expectedDeductions
]);
```

## 🛠️ Commands

### **Process Auto-Deductions**
```bash
# Run manually
php artisan sessions:process-auto-deductions

# Run with debug info
php artisan sessions:process-auto-deductions --debug
```

### **Test the System**
```bash
# Test the complete flow
php scripts/test_scheduler_auto_deduction.php
```

## 📊 Monitoring

### **Check Active Sessions**
```php
$activeSessions = TextSession::where('status', 'active')
    ->whereNotNull('activated_at')
    ->get();
```

### **Check Deduction Status**
```php
foreach ($activeSessions as $session) {
    $elapsedMinutes = $session->getElapsedMinutes();
    $expectedDeductions = floor($elapsedMinutes / 10);
    $alreadyProcessed = $session->auto_deductions_processed ?? 0;
    $newDeductions = $expectedDeductions - $alreadyProcessed;
    
    echo "Session {$session->id}: {$newDeductions} new deductions needed\n";
}
```

## 🔄 Auto-Ending

Auto-ending is handled by the existing `ProcessExpiredTextSessions` command:
- Runs every 5 minutes
- Ends sessions that have run out of time
- Ends sessions when patient has insufficient sessions
- Processes final payment and deductions

## 🎯 Benefits

1. **✅ Simple** - No queue workers needed
2. **✅ Reliable** - Uses Laravel's proven scheduler
3. **✅ Cost-Effective** - No additional infrastructure
4. **✅ Atomic** - Prevents double deductions
5. **✅ Recoverable** - Handles missed deductions automatically
6. **✅ Debuggable** - Clear logs and debug options

## 🚨 Troubleshooting

### **Deductions Not Happening**
1. Check if scheduler is running: `php artisan schedule:list`
2. Check active sessions: `php artisan sessions:process-auto-deductions --debug`
3. Verify session activation: Check `activated_at` timestamp

### **Double Deductions**
- System uses atomic updates to prevent this
- Check `auto_deductions_processed` field
- Review logs for concurrent processing

### **Manual Testing**
```bash
# Create test session
php scripts/create_single_test_session.php

# Run auto-deduction manually
php artisan sessions:process-auto-deductions --debug

# Check results
php scripts/check_session_status.php
```

## 📈 Performance

- **Low Overhead** - Only processes active sessions
- **Efficient** - Uses database indexes for queries
- **Scalable** - Works with any number of sessions
- **Safe** - Atomic operations prevent race conditions

---

**This system provides reliable, cost-effective auto-deductions without queue complexity! 🎉**
