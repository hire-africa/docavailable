# Appointment Time Flow Documentation

## Overview
This document explains how the DocAvailable app handles different appointment types when the scheduled appointment time is reached, covering chat, audio, and video call functionality.

## Appointment Types

The app supports three main appointment types:
1. **Text Appointments** - Text-based chat sessions
2. **Audio Appointments** - Voice call sessions  
3. **Video Appointments** - Video call sessions

## Time-Based Access Control

### Appointment Time Checking Logic

The app uses a `checkAppointmentTime()` function that:

1. **Parses appointment date and time** from the chat info
2. **Handles different time formats** (with/without AM/PM)
3. **Calculates time difference** between current time and appointment time
4. **Sets `isAppointmentTime` state** based on whether current time >= appointment time

```typescript
const checkAppointmentTime = useCallback(() => {
  if (!chatInfo?.appointment_date || !chatInfo?.appointment_time) {
    setIsAppointmentTime(true); // Allow interaction if no appointment info
    return;
  }

  // Parse and calculate time difference
  const appointmentDateTime = new Date(appointmentDate);
  appointmentDateTime.setHours(hours, minutes, 0, 0);
  
  const now = new Date();
  const timeDiff = appointmentDateTime.getTime() - now.getTime();
  
  if (timeDiff <= 0) {
    setIsAppointmentTime(true); // Appointment time has arrived
  } else {
    setIsAppointmentTime(false); // Appointment time hasn't arrived yet
    // Calculate and display time until appointment
  }
}, [chatInfo?.appointment_date, chatInfo?.appointment_time]);
```

## Feature Availability by Appointment Type

### 1. Text Appointments

**Before Appointment Time:**
- ❌ Chat input is disabled
- ❌ No call buttons available
- ✅ Shows countdown timer: "You're early! Your appointment starts at [time]"
- ✅ Displays appointment details

**After Appointment Time:**
- ✅ Chat interface is enabled
- ✅ Text input is enabled
- ✅ Full messaging functionality (text, voice messages, images)
- ❌ Voice call button is disabled (not available for text appointments)
- ❌ Video call button is disabled (not available for text appointments)
- ✅ Only chat features are active

### 2. Audio Appointments

**Before Appointment Time:**
- ❌ Chat interface is disabled
- ❌ Text input is disabled
- ❌ Audio call button is disabled
- ❌ Video call button is disabled
- ✅ Shows countdown timer
- ✅ Displays appointment details

**After Appointment Time:**
- ✅ Chat interface is enabled (for call buttons)
- ❌ Text input is disabled (cannot send messages)
- ✅ Audio call button is enabled (green, clickable)
- ❌ Video call button is disabled (not available for audio appointments)
- ✅ Only audio call features are active

### 3. Video Appointments

**Before Appointment Time:**
- ❌ Chat interface is disabled
- ❌ Text input is disabled
- ❌ Audio call button is disabled
- ❌ Video call button is disabled
- ✅ Shows countdown timer
- ✅ Displays appointment details

**After Appointment Time:**
- ✅ Chat interface is enabled (for call buttons)
- ❌ Text input is disabled (cannot send messages)
- ❌ Audio call button is disabled (not available for video appointments)
- ✅ Video call button is enabled (green, clickable)
- ✅ Only video call features are active

## Appointment Type Restrictions

The app now properly restricts features based on the specific appointment type booked:

### Feature Access Matrix

| Appointment Type | Chat Interface | Text Input | Audio Calls | Video Calls |
|------------------|----------------|------------|-------------|-------------|
| **Text** | ✅ | ✅ | ❌ | ❌ |
| **Audio** | ✅ (for call buttons) | ❌ | ✅ | ❌ |
| **Video** | ✅ (for call buttons) | ❌ | ❌ | ✅ |

### Implementation Logic

```typescript
// Check if chat interface should be enabled (for call buttons)
const isChatEnabled = () => {
  if (isTextSession) return true;
  if (appointmentType === 'text') return true;
  // For audio/video appointments, chat interface is available but text input is disabled
  if (appointmentType === 'audio' || appointmentType === 'voice' || appointmentType === 'video') return true;
  return false;
};

// Check if text input should be enabled (only for text sessions and text appointments)
const isTextInputEnabled = () => {
  if (isTextSession) return true;
  if (appointmentType === 'text') return true;
  // For audio/video appointments, text input is disabled
  return false;
};

// Check if audio calls should be enabled based on appointment type
const isAudioCallEnabled = () => {
  if (isTextSession) return true;
  if (appointmentType === 'audio' || appointmentType === 'voice') return true;
  return false;
};

// Check if video calls should be enabled based on appointment type
const isVideoCallEnabled = () => {
  if (isTextSession) return true;
  if (appointmentType === 'video') return true;
  return false;
};
```

## Call Button Logic

### Audio Call Button
```typescript
const isCallButtonEnabled = (callType: 'voice' | 'video' = 'voice') => {
  // Check if the specific call type is allowed for this appointment type
  const callTypeEnabled = callType === 'voice' ? isAudioCallEnabled() : isVideoCallEnabled();
  
  const webrtcReadyOrFallback = webrtcReady || process.env.EXPO_PUBLIC_ENABLE_AUDIO_CALLS === 'true';
  const appointmentTimeCheck = isTextSession || isAppointmentTime;
  const hasAvailableSessions = subscriptionData ? (
    callType === 'voice' ? subscriptionData.voiceCallsRemaining > 0 : subscriptionData.videoCallsRemaining > 0
  ) : true;
  
  return callTypeEnabled && webrtcReadyOrFallback && !showIncomingCall && appointmentTimeCheck && hasAvailableSessions;
};
```

### Video Call Button
- Uses same logic as audio call button
- Checks `videoCallsRemaining` instead of `voiceCallsRemaining`
- Only available for patients (doctors receive incoming calls)
- Only enabled for video appointments

## UI State Changes

### Before Appointment Time
```typescript
// Chat input is disabled
<TextInput
  editable={sessionValid && (isTextSession || isAppointmentTime)}
  style={{
    opacity: (sessionValid && (isTextSession || isAppointmentTime)) ? 1 : 0.5
  }}
  placeholder={
    !isTextSession && !isAppointmentTime && appointmentDateTime
    ? `You're early! Your appointment starts at ${appointmentDateTime.toLocaleTimeString()}`
    : "Type a message..."
  }
/>
```

### After Appointment Time
- All UI elements become fully functional
- Call buttons change from gray (disabled) to green (enabled)
- Chat input becomes editable
- Full messaging capabilities are unlocked

## Special Cases

### Instant Text Sessions
- **No time restriction** - available immediately
- **Always enabled** - `isTextSession` bypasses appointment time check
- **Real-time communication** - doctor must be online

### No Appointment Info
- **Default to enabled** - if no appointment date/time is available
- **Allows interaction** - assumes immediate availability
- **Fallback behavior** - prevents blocking legitimate sessions

## Subscription Requirements

### Voice Calls
- Requires `voiceCallsRemaining > 0` in subscription
- Checked before enabling call button
- Shows upgrade message if no calls remaining

### Video Calls  
- Requires `videoCallsRemaining > 0` in subscription
- Checked before enabling call button
- Shows upgrade message if no calls remaining

## Error Handling

### Time Parsing Errors
- **Default to enabled** - if time parsing fails
- **Logs error** - for debugging purposes
- **Prevents blocking** - ensures users aren't locked out

### WebRTC Issues
- **Fallback enabled** - if environment variable is set
- **Graceful degradation** - shows appropriate error messages
- **User feedback** - clear indication of call availability

### Appointment Type Restrictions
- **Clear error messages** - explains why features are not available
- **Appointment-specific feedback** - tells users what they can use instead
- **Graceful degradation** - disables buttons instead of hiding them

#### Error Message Examples:
- **Text appointments**: "Chat not available for video appointments - use video calls instead"
- **Audio appointments**: "Audio calls are not available for text appointments. Audio calls are only available for audio appointments."
- **Video appointments**: "Video calls are not available for audio appointments. Video calls are only available for video appointments."

## Real-time Updates

### Time Checking
- **Runs on chat info changes** - when appointment data loads
- **Updates UI immediately** - when appointment time is reached
- **No polling required** - event-driven updates

### State Management
- **`isAppointmentTime`** - controls feature availability
- **`appointmentDateTime`** - stores parsed appointment time
- **`timeUntilAppointment`** - displays countdown timer

## Summary

The appointment time flow ensures that:

1. **Users can't access features before appointment time** - prevents premature usage
2. **All features unlock simultaneously** - when appointment time is reached
3. **Different appointment types have same behavior** - consistent user experience
4. **Subscription limits are respected** - prevents overuse
5. **Error cases are handled gracefully** - robust fallback behavior

This creates a smooth, predictable experience where users know exactly when they can start their consultation and what features will be available to them.
