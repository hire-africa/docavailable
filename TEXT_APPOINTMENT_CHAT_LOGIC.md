# Text Appointment Chat Logic Implementation

## Overview
This document outlines the implementation of text appointment chat functionality that enables chat at appointment time with activity-based session management and deduction logic.

## Key Features

### 1. Session Management
- **Session Start**: Text appointment sessions automatically start when appointment time is reached
- **Activity Tracking**: Tracks activity from both patient and doctor
- **Session Duration**: Sessions can last as long as text sessions allow (based on subscription)
- **Manual End**: Patients can end sessions manually at any time

### 2. Activity Detection
- **Message Sending**: Tracks when either user sends a message
- **Message Receiving**: Tracks when either user receives a message
- **Activity Flags**: Separate flags for patient and doctor activity
- **Last Activity Time**: Tracks the timestamp of the last activity

### 3. Session Deduction Logic
- **No Activity in First 10 Minutes**: Session ends automatically, deducts 1 session
- **Activity Detected**: Session continues, deducts 1 session every 10 minutes
- **Manual End**: Deducts 1 session when user manually ends the session
- **Maximum Duration**: Limited by text session subscription limits

## Implementation Details

### State Management
```typescript
const [textAppointmentSession, setTextAppointmentSession] = useState<{
  isActive: boolean;
  startTime: Date | null;
  lastActivityTime: Date | null;
  hasPatientActivity: boolean;
  hasDoctorActivity: boolean;
  sessionsUsed: number;
  isEnded: boolean;
}>({
  isActive: false,
  startTime: null,
  lastActivityTime: null,
  hasPatientActivity: false,
  hasDoctorActivity: false,
  sessionsUsed: 0,
  isEnded: false
});
```

### Session Start Logic
```typescript
// Start text appointment session when appointment time is reached
useEffect(() => {
  if (isTextAppointment && isAppointmentTime && !textAppointmentSession.isActive && !textAppointmentSession.isEnded) {
    console.log('🕐 [TextAppointment] Starting text appointment session');
    setTextAppointmentSession(prev => ({
      ...prev,
      isActive: true,
      startTime: new Date(),
      lastActivityTime: new Date()
    }));
  }
}, [isTextAppointment, isAppointmentTime, textAppointmentSession.isActive, textAppointmentSession.isEnded]);
```

### Activity Tracking
```typescript
// Track activity when sending messages
if (isTextAppointment && textAppointmentSession.isActive) {
  setTextAppointmentSession(prev => ({
    ...prev,
    lastActivityTime: new Date(),
    hasPatientActivity: user?.user_type === 'patient' ? true : prev.hasPatientActivity,
    hasDoctorActivity: user?.user_type === 'doctor' ? true : prev.hasDoctorActivity
  }));
}

// Track activity when receiving messages
if (isTextAppointment && textAppointmentSession.isActive && String(message.sender_id) !== String(currentUserId)) {
  setTextAppointmentSession(prev => ({
    ...prev,
    lastActivityTime: new Date(),
    hasPatientActivity: String(message.sender_id) === String(chatInfo?.patient_id) ? true : prev.hasPatientActivity,
    hasDoctorActivity: String(message.sender_id) === String(chatInfo?.doctor_id) ? true : prev.hasDoctorActivity
  }));
}
```

### Session Monitoring
```typescript
// Monitor activity and handle session logic
useEffect(() => {
  if (!isTextAppointment || !textAppointmentSession.isActive || textAppointmentSession.isEnded) {
    return;
  }

  const checkActivity = () => {
    const now = new Date();
    const timeSinceLastActivity = textAppointmentSession.lastActivityTime 
      ? (now.getTime() - textAppointmentSession.lastActivityTime.getTime()) / (1000 * 60) // minutes
      : 0;

    // If no activity in first 10 minutes, end session and deduct 1
    if (timeSinceLastActivity >= 10 && !textAppointmentSession.hasPatientActivity && !textAppointmentSession.hasDoctorActivity) {
      console.log('⏰ [TextAppointment] No activity in first 10 minutes, ending session');
      endTextAppointmentSession(1); // Deduct 1 session
      return;
    }

    // If there was activity, check for 10-minute intervals for additional deductions
    if (textAppointmentSession.hasPatientActivity || textAppointmentSession.hasDoctorActivity) {
      const timeSinceStart = textAppointmentSession.startTime 
        ? (now.getTime() - textAppointmentSession.startTime.getTime()) / (1000 * 60) // minutes
        : 0;

      // Deduct 1 session every 10 minutes after the first 10 minutes
      const expectedSessionsUsed = Math.floor(timeSinceStart / 10);
      if (expectedSessionsUsed > textAppointmentSession.sessionsUsed) {
        console.log(`⏰ [TextAppointment] 10-minute interval reached, deducting session. Total: ${expectedSessionsUsed}`);
        setTextAppointmentSession(prev => ({
          ...prev,
          sessionsUsed: expectedSessionsUsed
        }));
        // TODO: Call API to deduct session
      }
    }
  };

  const interval = setInterval(checkActivity, 60000); // Check every minute
  return () => clearInterval(interval);
}, [isTextAppointment, textAppointmentSession]);
```

### Manual Session End
```typescript
// Function to end text appointment session
const endTextAppointmentSession = (additionalSessions = 0) => {
  const totalSessions = textAppointmentSession.sessionsUsed + additionalSessions;
  console.log(`🏁 [TextAppointment] Ending session, total sessions used: ${totalSessions}`);
  
  setTextAppointmentSession(prev => ({
    ...prev,
    isActive: false,
    isEnded: true
  }));

  // TODO: Call API to deduct sessions
  if (totalSessions > 0) {
    console.log(`💰 [TextAppointment] Deducting ${totalSessions} sessions from subscription`);
  }
};
```

### UI Updates
- **Text Input**: Enabled only when text appointment session is active
- **Placeholder**: Shows appropriate message for text appointment sessions
- **End Session Button**: Available for text appointment sessions
- **Send Button**: Enabled when text appointment session is active

## Session Flow

### 1. Before Appointment Time
- Text input is disabled
- Placeholder shows: "Text appointment session will start at appointment time"
- No session management active

### 2. At Appointment Time
- Session automatically starts
- Text input becomes enabled
- Activity tracking begins
- Placeholder shows: "Type a message..."

### 3. During Session
- Activity is tracked for both users
- Session deductions occur every 10 minutes if there's activity
- Users can send messages normally

### 4. Session End
- **Automatic**: If no activity in first 10 minutes, deducts 1 session
- **Manual**: When user ends session, deducts 1 session
- **Time-based**: Every 10 minutes of activity deducts 1 additional session

## Benefits

1. **Flexible Duration**: Sessions can last as long as subscription allows
2. **Fair Billing**: Only charges for actual usage time
3. **Activity-Based**: No charges if no one participates
4. **User Control**: Patients can end sessions when they want
5. **Automatic Management**: No manual intervention needed for timeouts

## TODO Items

1. **Backend API Integration**: Implement API calls for session deduction
2. **Database Updates**: Store session data and deductions
3. **Testing**: Test all scenarios and edge cases
4. **Error Handling**: Add proper error handling for API failures
5. **Analytics**: Track session metrics and usage patterns

## Notes

- This implementation keeps text appointments as appointments (not converting to text sessions)
- Chat functionality is enabled at appointment time
- Session management is handled entirely in the frontend
- Backend integration is needed for actual session deduction
- The logic ensures fair billing based on actual usage
