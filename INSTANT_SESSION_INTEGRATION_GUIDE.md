# Instant Session Integration Guide

## Problem
Your current chat screen uses `WebRTCChatService` but doesn't integrate with the `InstantSessionMessageDetector` that handles the 90-second timer for instant sessions.

## Solution
You need to integrate the instant session detector with your existing chat screen. Here are the steps:

### Step 1: Add the Instant Session Detector to Your Chat Screen

Add this to your chat screen imports:

```typescript
import { useInstantSessionDetector } from '../../hooks/useInstantSessionDetector';
import InstantSessionTimer from '../../components/InstantSessionTimer';
```

### Step 2: Add State and Logic

Add this to your chat screen component (after your existing state declarations):

```typescript
// Instant session detection state
const [showInstantSessionUI, setShowInstantSessionUI] = useState(false);

// Check if this is an instant session
const isInstantSession = appointmentId.startsWith('text_session_');

// Extract session ID for instant sessions
const sessionId = isInstantSession ? appointmentId.replace('text_session_', '') : '';

// Instant session detector hook
const {
  isConnected: instantSessionConnected,
  timerState,
  hasPatientSentMessage,
  hasDoctorResponded,
  isSessionActivated,
  isTimerActive,
  timeRemaining
} = useInstantSessionDetector({
  sessionId,
  appointmentId,
  patientId: user?.id || 0,
  doctorId: chatInfo?.doctor_id || 0,
  authToken: user?.token || '',
  enabled: isInstantSession
});

// Show instant session UI when patient sends first message
useEffect(() => {
  if (isInstantSession && hasPatientSentMessage && !hasDoctorResponded) {
    setShowInstantSessionUI(true);
  } else if (isInstantSession && (hasDoctorResponded || isSessionActivated)) {
    setShowInstantSessionUI(false);
  }
}, [isInstantSession, hasPatientSentMessage, hasDoctorResponded, isSessionActivated]);
```

### Step 3: Modify Your Send Message Function

Update your `sendMessage` function to detect when patient sends first message:

```typescript
const sendMessage = async () => {
  if (!newMessage.trim()) return;
  
  try {
    setSending(true);
    
    // Check if this is the first patient message in an instant session
    if (isInstantSession && !hasPatientSentMessage) {
      console.log('👤 [InstantSession] First patient message detected - timer will start');
    }
    
    if (webrtcChatService) {
      // Use WebRTC chat service if available
      console.log('📤 [ChatComponent] Sending message via WebRTC:', newMessage.trim());
      const message = await webrtcChatService.sendMessage(newMessage.trim());
      if (message) {
        setNewMessage('');
        console.log('✅ [ChatComponent] Message sent successfully via WebRTC:', message.id);
      }
    } else {
      // Fallback to backend API
      await sendMessageViaBackendAPI();
    }
  } catch (error) {
    console.error('❌ [ChatComponent] Error sending message:', error);
    // Handle error...
  } finally {
    setSending(false);
  }
};
```

### Step 4: Add the Timer UI to Your Chat Screen

Add this to your chat screen JSX (after your header but before your messages):

```typescript
{/* Instant Session Timer */}
{isInstantSession && showInstantSessionUI && (
  <InstantSessionTimer
    isActive={isTimerActive}
    timeRemaining={timeRemaining}
    hasPatientSentMessage={hasPatientSentMessage}
    hasDoctorResponded={hasDoctorResponded}
    isSessionActivated={isSessionActivated}
    onTimerExpired={() => {
      console.log('⏰ [InstantSession] Timer expired');
      // Handle timer expiration
    }}
  />
)}
```

### Step 5: Modify Your Input Section

Update your input section to show the waiting state:

```typescript
{/* Input Area */}
<View style={styles.inputContainer}>
  <TextInput
    style={[
      styles.textInput,
      isInstantSession && hasPatientSentMessage && !hasDoctorResponded && !isSessionActivated && styles.textInputDisabled
    ]}
    value={newMessage}
    onChangeText={setNewMessage}
    placeholder={
      isInstantSession && hasPatientSentMessage && !hasDoctorResponded && isTimerActive
        ? 'Waiting for doctor to respond...'
        : isInstantSession && hasPatientSentMessage && !hasDoctorResponded && !isTimerActive
        ? 'Session expired - doctor did not respond'
        : 'Type your message...'
    }
    multiline
    editable={
      !isInstantSession || 
      !hasPatientSentMessage || 
      hasDoctorResponded || 
      isSessionActivated
    }
  />
  <TouchableOpacity
    style={[
      styles.sendButton,
      (!newMessage.trim() || (isInstantSession && hasPatientSentMessage && !hasDoctorResponded && !isSessionActivated)) && styles.sendButtonDisabled
    ]}
    onPress={sendMessage}
    disabled={
      !newMessage.trim() || 
      (isInstantSession && hasPatientSentMessage && !hasDoctorResponded && !isSessionActivated)
    }
  >
    <Text style={styles.sendButtonText}>Send</Text>
  </TouchableOpacity>
</View>
```

### Step 6: Add Debug Information (Optional)

Add this debug section to help troubleshoot:

```typescript
{/* Debug Info - Remove in production */}
{__DEV__ && isInstantSession && (
  <View style={styles.debugContainer}>
    <Text style={styles.debugTitle}>Instant Session Debug:</Text>
    <Text style={styles.debugText}>Connected: {instantSessionConnected ? 'Yes' : 'No'}</Text>
    <Text style={styles.debugText}>Patient Sent: {hasPatientSentMessage ? 'Yes' : 'No'}</Text>
    <Text style={styles.debugText}>Doctor Responded: {hasDoctorResponded ? 'Yes' : 'No'}</Text>
    <Text style={styles.debugText}>Session Activated: {isSessionActivated ? 'Yes' : 'No'}</Text>
    <Text style={styles.debugText}>Timer Active: {isTimerActive ? 'Yes' : 'No'}</Text>
    <Text style={styles.debugText}>Time Remaining: {timeRemaining}s</Text>
  </View>
)}
```

### Step 7: Add Required Styles

Add these styles to your StyleSheet:

```typescript
textInputDisabled: {
  backgroundColor: Colors.lightGray + '30',
  borderColor: Colors.gray,
  color: Colors.gray,
},
debugContainer: {
  backgroundColor: Colors.lightGray,
  padding: 12,
  margin: 16,
  borderRadius: 8,
},
debugTitle: {
  fontSize: 14,
  fontWeight: 'bold',
  color: Colors.text,
  marginBottom: 8,
},
debugText: {
  fontSize: 12,
  color: Colors.text,
  marginBottom: 2,
},
```

## Testing

1. **Build and install** your APK
2. **Start an instant session** (text session)
3. **Send a message** as a patient
4. **Check the debug info** to see if the detector is working
5. **Verify the timer appears** and shows "Waiting for doctor to respond..."

## Troubleshooting

If it's still not working:

1. **Check console logs** for instant session detector messages
2. **Verify WebRTC connection** is working
3. **Check if appointmentId** starts with `text_session_`
4. **Ensure user IDs** are correct (patient and doctor)
5. **Verify auth token** is valid

## Quick Test

Add this temporary button to test the detector:

```typescript
{__DEV__ && (
  <TouchableOpacity 
    style={styles.testButton}
    onPress={() => {
      console.log('🔍 [Debug] Instant Session State:', {
        isInstantSession,
        hasPatientSentMessage,
        hasDoctorResponded,
        isSessionActivated,
        isTimerActive,
        timeRemaining
      });
    }}
  >
    <Text style={styles.testButtonText}>Debug Instant Session</Text>
  </TouchableOpacity>
)}
```

This will help you see the current state of the instant session detector.
