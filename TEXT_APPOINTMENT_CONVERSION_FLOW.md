# Text Appointment to Text Session Conversion Flow

## Overview
This document explains the complete flow of how text appointments are automatically converted to text sessions when the scheduled appointment time is reached.

## Complete Flow

### 1. **Frontend Monitoring** (`useTextAppointmentConverter` hook)

**Location**: `hooks/useTextAppointmentConverter.ts`

**How it works**:
- Runs every 60 seconds to check all appointments
- Calls `textSessionService.shouldConvertToTextSession()` for each appointment
- If conversion is needed, calls `textSessionService.createTextSessionFromAppointment()`

**Key functions**:
```typescript
// Check if appointment should be converted
const shouldConvert = textSessionService.shouldConvertToTextSession(appointment);

// Create text session from appointment
const textSession = await textSessionService.createTextSessionFromAppointment(appointment);
```

### 2. **Time Validation** (`textSessionService.shouldConvertToTextSession`)

**Location**: `services/textSessionService.ts`

**Validation checks**:
- ✅ Appointment type is 'text'
- ✅ Appointment status is 'confirmed' or 1
- ✅ Appointment time has been reached (current time >= appointment time)
- ✅ Handles different date formats (MM/DD/YYYY and YYYY-MM-DD)
- ✅ Handles time formats with/without AM/PM

**Code**:
```typescript
const shouldConvertToTextSession = (appointment: Appointment): boolean => {
  const isTextAppointment = appointment.appointment_type === 'text';
  const isConfirmed = appointment.status === 'confirmed' || appointment.status === 1;
  
  if (!isTextAppointment || !isConfirmed) {
    return false;
  }

  // Check if appointment time has been reached
  const appointmentDateTime = parseAppointmentDateTime(appointment);
  const now = new Date();
  return appointmentDateTime.getTime() <= now.getTime();
};
```

### 3. **API Call** (`textSessionService.createTextSessionFromAppointment`)

**Location**: `services/textSessionService.ts`

**API Endpoint**: `POST /text-sessions/create-from-appointment`

**Request payload**:
```typescript
{
  appointment_id: number,
  doctor_id: number,
  patient_id: number,
  appointment_type: 'text',
  reason: string
}
```

### 4. **Backend Processing** (`TextSessionController.createFromAppointment`)

**Location**: `backend/app/Http/Controllers/TextSessionController.php`

**Validation steps**:
1. ✅ Validate request parameters
2. ✅ Verify appointment exists and is text type
3. ✅ Check appointment is confirmed
4. ✅ Verify appointment time has been reached
5. ✅ Check if text session already exists (prevent duplicates)
6. ✅ Verify patient has active subscription
7. ✅ Check patient has text sessions remaining

**Processing steps**:
1. Create new TextSession record
2. Deduct one text session from patient's subscription
3. Set session status to 'waiting_for_doctor'
4. Log the conversion
5. Return success response with session data

**Response**:
```json
{
  "success": true,
  "message": "Text session created successfully from appointment",
  "data": {
    "id": 123,
    "appointment_id": 456,
    "doctor_id": 789,
    "patient_id": 101,
    "status": "waiting_for_doctor",
    "reason": "Follow-up consultation",
    "sessions_remaining": 4,
    "created_at": "2024-01-15T14:30:00Z",
    "doctor": {
      "id": 789,
      "name": "Dr. John Smith",
      "first_name": "John",
      "last_name": "Smith"
    },
    "remaining_time_minutes": 90
  }
}
```

### 5. **Frontend Updates**

**Location**: `app/patient-dashboard.tsx`

**What happens after successful conversion**:
1. `onTextSessionCreated` callback is triggered
2. Patient dashboard refreshes messages tab
3. New text session appears in messages list
4. User can now access the text session chat

**Code**:
```typescript
const { triggerConversionCheck } = useTextAppointmentConverter({
  appointments: getSafeAppointments(),
  onTextSessionCreated: (textSession) => {
    console.log('🔄 [PatientDashboard] Text session created from appointment:', textSession);
    refreshMessagesTab(); // Refresh to show new session
  },
  onAppointmentUpdated: (appointmentId) => {
    console.log('🔄 [PatientDashboard] Appointment updated:', appointmentId);
    refreshMessagesTab();
  }
});
```

## Database Changes

### TextSession Table
- New record created with `appointment_id` linking to original appointment
- Status set to 'waiting_for_doctor'
- Sessions deducted from patient's subscription

### Subscription Table
- `text_sessions_remaining` decremented by 1
- Updated timestamp

## Error Handling

### Frontend Errors
- Network errors during API calls
- Invalid appointment data
- Time parsing errors

### Backend Errors
- Appointment not found (404)
- Invalid appointment type (400)
- Appointment not confirmed (400)
- Appointment time not reached (400)
- Text session already exists (200 with existing data)
- No active subscription (400)
- No sessions remaining (400)

## Security Considerations

1. **Authentication**: All API calls require valid authentication token
2. **Authorization**: Only the patient who owns the appointment can convert it
3. **Validation**: Multiple validation layers prevent unauthorized conversions
4. **Idempotency**: Duplicate conversions are prevented by checking existing sessions

## Monitoring and Logging

### Frontend Logs
- Conversion attempts and results
- API call success/failure
- Time validation results

### Backend Logs
- Successful conversions with session details
- Error conditions with context
- Subscription deduction tracking

## Testing Scenarios

### ✅ Valid Conversion
1. Text appointment scheduled for 2:00 PM
2. Current time is 2:05 PM
3. Appointment is confirmed
4. Patient has active subscription with sessions remaining
5. **Result**: Text session created successfully

### ❌ Invalid Scenarios
1. **Wrong appointment type**: Audio/video appointments cannot be converted
2. **Not confirmed**: Pending appointments cannot be converted
3. **Time not reached**: Early conversion attempts are rejected
4. **No subscription**: Patient without active subscription cannot convert
5. **No sessions remaining**: Patient with 0 sessions cannot convert
6. **Already converted**: Duplicate conversion attempts return existing session

## Performance Considerations

- **Polling interval**: 60 seconds (configurable)
- **Batch processing**: Multiple appointments checked in single cycle
- **Caching**: Processed appointments are cached to prevent duplicate checks
- **Database optimization**: Indexes on appointment_id, user_id, status fields

## Future Enhancements

1. **Real-time notifications**: Push notifications when conversion occurs
2. **Batch conversion**: Process multiple appointments simultaneously
3. **Scheduled jobs**: Use Laravel scheduler instead of frontend polling
4. **Webhook support**: Real-time updates via webhooks
5. **Analytics**: Track conversion rates and timing patterns
