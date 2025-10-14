# Text Appointment Backend Implementation

## Overview
This document outlines the complete backend implementation for text appointment chat functionality with activity-based session management and deduction logic.

## Backend Components

### 1. Database Migration
**File**: `backend/database/migrations/2024_01_01_000000_create_text_appointment_sessions_table.php`

Creates the `text_appointment_sessions` table with the following structure:
- `id`: Primary key
- `appointment_id`: Foreign key to appointments table
- `patient_id`: Foreign key to users table (patient)
- `doctor_id`: Foreign key to users table (doctor)
- `is_active`: Boolean flag for active sessions
- `start_time`: When the session started
- `last_activity_time`: Last activity timestamp
- `has_patient_activity`: Boolean flag for patient activity
- `has_doctor_activity`: Boolean flag for doctor activity
- `sessions_used`: Number of sessions used
- `is_ended`: Boolean flag for ended sessions
- `ended_at`: When the session ended
- `created_at`, `updated_at`: Timestamps

### 2. Controller
**File**: `backend/app/Http/Controllers/TextAppointmentController.php`

#### Methods:

##### `startSession(Request $request)`
- **Purpose**: Start a text appointment session when appointment time is reached
- **Validation**: Validates appointment exists, is text type, confirmed, and time reached
- **Logic**: Creates session record, checks subscription
- **Response**: Returns session data with success status

##### `updateActivity(Request $request)`
- **Purpose**: Update activity when messages are sent/received
- **Validation**: Validates appointment exists and user type
- **Logic**: Updates last activity time and user activity flags
- **Response**: Returns success status

##### `processDeduction(Request $request)`
- **Purpose**: Process session deductions based on usage
- **Validation**: Validates sessions to deduct and reason
- **Logic**: Deducts sessions from subscription, updates session record
- **Response**: Returns deduction details

##### `endSession(Request $request)`
- **Purpose**: End text appointment session manually
- **Validation**: Validates appointment exists and user authorization
- **Logic**: Processes final deduction, marks session as ended
- **Response**: Returns session end details

##### `getSessionStatus(Request $request, $appointmentId)`
- **Purpose**: Get current session status for an appointment
- **Validation**: Validates appointment exists and user authorization
- **Logic**: Returns session data if active
- **Response**: Returns session status or inactive message

### 3. API Routes
**File**: `backend/routes/api.php`

Added the following routes under authenticated middleware:
```php
// Text appointment session routes
Route::post('/text-appointments/start-session', [TextAppointmentController::class, 'startSession']);
Route::post('/text-appointments/update-activity', [TextAppointmentController::class, 'updateActivity']);
Route::post('/text-appointments/process-deduction', [TextAppointmentController::class, 'processDeduction']);
Route::post('/text-appointments/end-session', [TextAppointmentController::class, 'endSession']);
Route::get('/text-appointments/{appointmentId}/session-status', [TextAppointmentController::class, 'getSessionStatus']);
```

## Frontend Integration

### 1. Session Management
The frontend now calls backend APIs for all session operations:

#### Starting Sessions
```typescript
const startTextAppointmentSession = async () => {
  const response = await apiService.post('/text-appointments/start-session', {
    appointment_id: getNumericAppointmentId()
  });
  // Handle response and update state
};
```

#### Activity Tracking
```typescript
const updateTextAppointmentActivity = async () => {
  const response = await apiService.post('/text-appointments/update-activity', {
    appointment_id: getNumericAppointmentId(),
    user_type: user?.user_type
  });
  // Handle response
};
```

#### Session Deductions
```typescript
const processTextAppointmentDeduction = async (sessionsToDeduct: number, reason: string) => {
  const response = await apiService.post('/text-appointments/process-deduction', {
    appointment_id: getNumericAppointmentId(),
    sessions_to_deduct: sessionsToDeduct,
    reason: reason
  });
  // Handle response
};
```

#### Ending Sessions
```typescript
const endTextAppointmentSession = async (additionalSessions = 0) => {
  const response = await apiService.post('/text-appointments/end-session', {
    appointment_id: getNumericAppointmentId(),
    sessions_to_deduct: additionalSessions
  });
  // Handle response and update state
};
```

### 2. Activity Monitoring
The frontend monitors activity and triggers deductions:

#### 10-Minute Intervals
- Checks every minute for 10-minute intervals
- Calls `processTextAppointmentDeduction` with reason 'interval'
- Updates local state with new session count

#### No Activity Timeout
- If no activity in first 10 minutes, ends session
- Calls `processTextAppointmentDeduction` with reason 'no_activity'
- Calls `endTextAppointmentSession` to end session

#### Manual End
- When user manually ends session
- Calls `processTextAppointmentDeduction` with reason 'manual_end'
- Calls `endTextAppointmentSession` to end session

## Session Flow

### 1. Session Start
1. Frontend detects appointment time reached
2. Calls `/text-appointments/start-session` API
3. Backend creates session record
4. Frontend updates local state

### 2. Activity Tracking
1. User sends/receives message
2. Frontend calls `/text-appointments/update-activity` API
3. Backend updates activity flags and timestamp
4. Frontend updates local state

### 3. Session Deductions
1. Frontend detects 10-minute interval or timeout
2. Calls `/text-appointments/process-deduction` API
3. Backend deducts sessions from subscription
4. Frontend updates local session count

### 4. Session End
1. User manually ends or timeout occurs
2. Frontend calls `/text-appointments/end-session` API
3. Backend processes final deduction and marks session ended
4. Frontend updates local state and shows rating modal

## Error Handling

### Backend Error Handling
- Validates all input parameters
- Checks user authorization
- Verifies appointment and subscription status
- Logs all errors with context
- Returns appropriate HTTP status codes

### Frontend Error Handling
- Catches API errors gracefully
- Logs errors to console
- Continues operation even if API calls fail
- Shows appropriate user feedback

## Security Considerations

### Authentication
- All routes require authentication
- Users can only access their own appointments
- Validates user authorization for each operation

### Data Validation
- Validates all input parameters
- Checks appointment and subscription status
- Prevents unauthorized access

### Logging
- Comprehensive logging for debugging
- Tracks all session operations
- Monitors error conditions

## Testing

### Backend Testing
- Test all API endpoints
- Verify validation logic
- Check error handling
- Test database operations

### Frontend Testing
- Test session start/end flows
- Verify activity tracking
- Check deduction logic
- Test error scenarios

## Deployment

### Database Migration
1. Run the migration to create the table:
   ```bash
   php artisan migrate
   ```

### Backend Deployment
1. Deploy the new controller and routes
2. Test API endpoints
3. Monitor logs for errors

### Frontend Deployment
1. Deploy updated chat component
2. Test text appointment flows
3. Verify API integration

## Monitoring

### Key Metrics
- Session start/end rates
- Activity tracking accuracy
- Deduction processing success
- Error rates and types

### Logging
- All operations logged with context
- Error tracking and debugging
- Performance monitoring

## Benefits

1. **Reliable Backend**: All session data stored in database
2. **Real-time Tracking**: Activity tracked in real-time
3. **Accurate Billing**: Sessions deducted based on actual usage
4. **Error Recovery**: Robust error handling and logging
5. **Scalable**: Database-backed solution scales with usage
6. **Auditable**: All operations logged for audit trail

## Next Steps

1. **Run Migration**: Deploy database migration
2. **Test APIs**: Verify all endpoints work correctly
3. **Deploy Backend**: Deploy controller and routes
4. **Deploy Frontend**: Deploy updated chat component
5. **Monitor**: Watch logs and metrics
6. **Optimize**: Fine-tune based on usage patterns
