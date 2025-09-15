# 🚀 Queue-Based Session Management System

## 📋 Overview

This document describes the new queue-based session management system that replaces the old scheduler-based approach. The new system provides:

- ✅ **Precise timing** - Exact 10-minute auto-deductions
- ✅ **Atomic operations** - Prevents double deductions
- ✅ **Manual ending support** - Safe manual session termination
- ✅ **No external dependencies** - Uses Laravel's built-in queue system
- ✅ **Cost-effective** - No additional paid services required

## 🔧 Implementation Details

### **Core Components**

1. **Queue Jobs**
   - `ProcessTextSessionAutoDeduction` - Handles 10-minute auto-deductions
   - `EndTextSession` - Handles session auto-ending

2. **TextSession Model Methods**
   - `scheduleAutoDeductions()` - Schedules deduction jobs
   - `scheduleAutoEndForInsufficientSessions()` - Schedules ending jobs
   - `endManually()` - Handles manual session ending

3. **DoctorPaymentService**
   - `processManualEndDeduction()` - Processes manual end deductions

### **How It Works**

#### **Session Activation Flow**
```
1. Doctor sends first message
2. Session status changes to 'active'
3. activated_at timestamp is set
4. scheduleAutoDeductions() is called
5. scheduleAutoEndForInsufficientSessions() is called
6. Queue jobs are scheduled for future execution
```

#### **Auto-Deduction Flow**
```
1. Queue job executes at 10-minute intervals
2. Atomic update checks auto_deductions_processed
3. Only processes new deductions (prevents double processing)
4. Deducts 1 session from patient subscription
5. Awards payment to doctor
6. Updates session tracking fields
```

#### **Auto-Ending Flow**
```
1. Queue job executes when time runs out
2. Atomic update checks session status
3. Only ends if still active (prevents double ending)
4. Processes final payment and deductions
5. Updates session status to 'ended'
```

#### **Manual Ending Flow**
```
1. User calls endSession API endpoint
2. endManually() method is called
3. Atomic transaction prevents double ending
4. Processes 1 additional session deduction
5. Awards payment to doctor
6. Updates session status to 'ended'
```

## 🚀 Deployment Instructions

### **Step 1: Database Setup**

Ensure your database has the required tables:

```sql
-- Jobs table (should already exist)
CREATE TABLE IF NOT EXISTS jobs (
    id BIGSERIAL PRIMARY KEY,
    queue VARCHAR(255) NOT NULL,
    payload TEXT NOT NULL,
    attempts SMALLINT NOT NULL,
    reserved_at INTEGER,
    available_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
);

-- Failed jobs table (should already exist)
CREATE TABLE IF NOT EXISTS failed_jobs (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(255) UNIQUE NOT NULL,
    connection TEXT NOT NULL,
    queue TEXT NOT NULL,
    payload TEXT NOT NULL,
    exception TEXT NOT NULL,
    failed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### **Step 2: Queue Configuration**

The queue configuration is already set up in `config/queue.php`:

```php
'text-sessions' => [
    'driver' => 'database',
    'table' => 'jobs',
    'queue' => 'text-sessions',
    'retry_after' => 90,
    'after_commit' => false,
],
```

### **Step 3: Environment Variables**

Set these environment variables:

```env
QUEUE_CONNECTION=database
QUEUE_FAILED_DRIVER=database-uuids
```

### **Step 4: Start Queue Workers**

#### **Option A: Single Queue Worker (Recommended)**
```bash
php artisan queue:work --queue=text-sessions,default --tries=3 --timeout=60
```

#### **Option B: Separate Queue Workers**
```bash
# For text sessions only
php artisan queue:work --queue=text-sessions --tries=3 --timeout=60

# For other jobs
php artisan queue:work --queue=default --tries=3 --timeout=60
```

#### **Option C: All Queues**
```bash
php artisan queue:work --tries=3 --timeout=60
```

### **Step 5: Production Deployment**

#### **Using Supervisor (Linux/Mac)**
```bash
# Install supervisor
sudo apt-get install supervisor

# Create configuration file
sudo nano /etc/supervisor/conf.d/laravel-worker.conf
```

Add this configuration:
```ini
[program:laravel-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /path/to/your/project/artisan queue:work --queue=text-sessions,default --tries=3 --timeout=60
autostart=true
autorestart=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/path/to/your/project/storage/logs/worker.log
stopwaitsecs=3600
```

Start supervisor:
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start laravel-worker:*
```

#### **Using Windows Task Scheduler**
1. Create a batch file `start-queue-worker.bat`:
```batch
cd /d C:\path\to\your\project
php artisan queue:work --queue=text-sessions,default --tries=3 --timeout=60
```

2. Set up Task Scheduler to run this batch file on system startup

#### **Using Render (Recommended)**
Update your `render.yaml`:

```yaml
services:
  - type: web
    name: docavailable-backend
    env: php
    buildCommand: composer install
    startCommand: |
      php artisan migrate --force
      php artisan queue:work --queue=text-sessions,default --tries=3 --timeout=60 &
      php artisan serve --host=0.0.0.0 --port=$PORT
    envVars:
      - key: QUEUE_CONNECTION
        value: database

  - type: worker
    name: docavailable-queue-worker
    env: php
    buildCommand: composer install
    startCommand: php artisan queue:work --queue=text-sessions,default --tries=3 --timeout=60
    envVars:
      - key: QUEUE_CONNECTION
        value: database
```

## 🧪 Testing

### **Run the Test Script**
```bash
cd backend
php scripts/test_queue_based_sessions.php
```

This will test:
- ✅ Session creation and activation
- ✅ Queue job scheduling
- ✅ Manual session ending
- ✅ Subscription deductions
- ✅ Atomic operations (double processing prevention)
- ✅ Insufficient sessions handling

### **Manual Testing**

#### **Test Auto-Deductions**
1. Create a text session
2. Activate it (doctor sends message)
3. Wait 10 minutes
4. Check if session deduction occurred
5. Verify subscription sessions decreased

#### **Test Manual Ending**
1. Create and activate a text session
2. Send some messages
3. Call the end session API
4. Verify session ended and deduction occurred

#### **Test Double Processing Prevention**
1. Try to end the same session twice
2. Verify only the first attempt succeeds
3. Check logs for atomic operation messages

## 📊 Monitoring

### **Queue Status**
```bash
# Check queue status
php artisan queue:work --once --queue=text-sessions

# Check failed jobs
php artisan queue:failed

# Retry failed jobs
php artisan queue:retry all
```

### **Log Monitoring**
Monitor these log entries:
- `Queue-based auto-deduction processed`
- `Queue-based session ending processed`
- `Session ended manually`
- `Auto-deduction job skipped - already processed`

### **Database Monitoring**
```sql
-- Check active sessions
SELECT * FROM text_sessions WHERE status = 'active';

-- Check queue jobs
SELECT * FROM jobs WHERE queue = 'text-sessions';

-- Check failed jobs
SELECT * FROM failed_jobs;
```

## 🔒 Safety Features

### **Atomic Operations**
- All session updates use atomic database operations
- Prevents race conditions and double processing
- Uses `WHERE` clauses to ensure single execution

### **Safety Checks**
- Prevents negative session deductions
- Validates session status before processing
- Checks subscription status before deductions

### **Error Handling**
- Failed jobs are logged and can be retried
- Graceful degradation if queue system fails
- Comprehensive error logging

## 🚨 Troubleshooting

### **Common Issues**

#### **Queue Worker Not Running**
```bash
# Check if queue worker is running
ps aux | grep "queue:work"

# Start queue worker
php artisan queue:work --queue=text-sessions,default
```

#### **Jobs Not Processing**
```bash
# Check queue jobs
php artisan queue:work --once --queue=text-sessions

# Check failed jobs
php artisan queue:failed
```

#### **Database Connection Issues**
```bash
# Test database connection
php artisan tinker
DB::connection()->getPdo();
```

### **Log Analysis**
```bash
# Check Laravel logs
tail -f storage/logs/laravel.log | grep -E "(auto-deduction|session ending)"

# Check queue worker logs
tail -f storage/logs/worker.log
```

## 📈 Performance

### **Queue Performance**
- Jobs are processed asynchronously
- No impact on API response times
- Automatic retry on failures
- Configurable timeout and retry limits

### **Database Performance**
- Atomic operations minimize database locks
- Efficient indexing on queue tables
- Minimal database overhead

### **Scalability**
- Multiple queue workers can run simultaneously
- Queue jobs are distributed across workers
- Horizontal scaling supported

## 🔄 Migration from Old System

### **What Changed**
1. **Removed**: Scheduler-based auto-deductions
2. **Removed**: Scheduler-based auto-ending
3. **Added**: Queue-based job scheduling
4. **Added**: Atomic operations for safety
5. **Added**: Manual ending with proper deductions

### **Backward Compatibility**
- All existing API endpoints remain the same
- Session data structure unchanged
- Subscription deductions work the same way
- Only the internal processing mechanism changed

### **Rollback Plan**
If issues occur, you can temporarily disable queue workers and re-enable the old scheduler:

```php
// In routes/console.php, uncomment these lines:
Schedule::command('sessions:process-auto-deductions')
    ->everyTenMinutes()
    ->withoutOverlapping()
    ->runInBackground();

Schedule::command('sessions:process-expired-text-sessions')
    ->everyMinute()
    ->withoutOverlapping()
    ->runInBackground();
```

## ✅ Success Criteria

The system is working correctly when:

1. ✅ Sessions are activated when doctor responds
2. ✅ Auto-deductions occur exactly every 10 minutes
3. ✅ Sessions auto-end when time runs out
4. ✅ Manual ending works with proper deductions
5. ✅ No double deductions occur
6. ✅ No negative session counts
7. ✅ Queue jobs process reliably
8. ✅ Failed jobs are logged and can be retried

## 📞 Support

If you encounter issues:

1. Check the logs for error messages
2. Run the test script to verify functionality
3. Monitor queue worker status
4. Verify database connections
5. Check environment variables

The new queue-based system provides a robust, scalable, and reliable solution for session management with precise timing and comprehensive safety features.
