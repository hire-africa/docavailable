# Instant Session Message Detection System

## Overview

This system provides real-time message detection for instant sessions through WebRTC, implementing a 90-second timer system that activates when a patient sends their first message and stops when the doctor responds.

## Features

- 🔍 **Real-time Message Detection**: Detects patient and doctor messages through WebRTC signaling
- ⏰ **90-Second Timer**: Automatically starts when patient sends first message
- 🛑 **Auto-Stop Timer**: Stops when doctor responds, activating the session
- 📱 **React Integration**: Easy-to-use hooks and components
- 💾 **State Persistence**: Maintains state across app restarts
- 🔄 **Auto-Reconnection**: Handles connection drops gracefully

## Architecture

```
Patient Message → WebRTC Detection → 90s Timer Start → Doctor Response → Timer Stop → Session Activation
```

## Components

### 1. InstantSessionMessageDetector (Service)

Core service that handles WebRTC message detection and timer management.

```typescript
import { InstantSessionMessageDetector } from '../services/instantSessionMessageDetector';

const detector = new InstantSessionMessageDetector(config, events);
await detector.connect();
```

### 2. useInstantSessionDetector (Hook)

React hook for easy integration in components.

```typescript
import { useInstantSessionDetector } from '../hooks/useInstantSessionDetector';

const {
  isConnected,
  timerState,
  hasPatientSentMessage,
  hasDoctorResponded,
  isSessionActivated,
  isTimerActive,
  timeRemaining
} = useInstantSessionDetector({
  sessionId: '123',
  appointmentId: 'text_session_123',
  patientId: 456,
  doctorId: 789,
  authToken: 'your-token'
});
```

### 3. InstantSessionTimer (Component)

UI component that displays the timer and session status.

```typescript
import InstantSessionTimer from '../components/InstantSessionTimer';

<InstantSessionTimer
  isActive={isTimerActive}
  timeRemaining={timeRemaining}
  hasPatientSentMessage={hasPatientSentMessage}
  hasDoctorResponded={hasDoctorResponded}
  isSessionActivated={isSessionActivated}
  onTimerExpired={handleTimerExpired}
/>
```

## Integration Guide

### Step 1: Install Dependencies

Ensure you have the required dependencies:

```json
{
  "@react-native-async-storage/async-storage": "^1.x.x",
  "react-native": "^0.70.x"
}
```

### Step 2: Set Up WebRTC Server

The system requires a WebRTC signaling server. Update your server configuration:

```javascript
// backend/webrtc-signaling-server.js
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000';
const PORT = process.env.WEBRTC_SIGNALING_PORT || 8080;
```

### Step 3: Environment Variables

Add to your `.env` file:

```env
EXPO_PUBLIC_WEBRTC_SIGNALING_URL=ws://your-server:8080
EXPO_PUBLIC_API_URL=http://your-api-server:8000
```

### Step 4: Basic Integration

```typescript
import React from 'react';
import { useInstantSessionDetector } from '../hooks/useInstantSessionDetector';
import InstantSessionTimer from '../components/InstantSessionTimer';

export default function ChatScreen() {
  const {
    isConnected,
    timerState,
    hasPatientSentMessage,
    hasDoctorResponded,
    isSessionActivated,
    isTimerActive,
    timeRemaining
  } = useInstantSessionDetector({
    sessionId: '123',
    appointmentId: 'text_session_123',
    patientId: 456,
    doctorId: 789,
    authToken: 'your-token'
  });

  return (
    <View>
      {hasPatientSentMessage && (
        <InstantSessionTimer
          isActive={isTimerActive}
          timeRemaining={timeRemaining}
          hasPatientSentMessage={hasPatientSentMessage}
          hasDoctorResponded={hasDoctorResponded}
          isSessionActivated={isSessionActivated}
          onTimerExpired={() => console.log('Timer expired')}
        />
      )}
    </View>
  );
}
```

## API Reference

### InstantSessionMessageDetector

#### Constructor

```typescript
new InstantSessionMessageDetector(config: InstantSessionConfig, events: MessageDetectionEvents)
```

#### Methods

- `connect(): Promise<void>` - Connect to WebRTC signaling server
- `disconnect(): Promise<void>` - Disconnect from server
- `getTimerState(): TimerState` - Get current timer state
- `isSessionActivated(): boolean` - Check if session is activated
- `hasPatientSentMessage(): boolean` - Check if patient sent message
- `hasDoctorRespondedToMessage(): boolean` - Check if doctor responded
- `getConnectionStatus(): boolean` - Get connection status
- `clearSessionState(): Promise<void>` - Clear stored state

### useInstantSessionDetector Hook

#### Parameters

```typescript
interface UseInstantSessionDetectorOptions {
  sessionId: string;
  appointmentId: string;
  patientId: number;
  doctorId: number;
  authToken: string;
  enabled?: boolean;
}
```

#### Returns

```typescript
interface UseInstantSessionDetectorReturn {
  isConnected: boolean;
  timerState: TimerState;
  hasPatientSentMessage: boolean;
  hasDoctorResponded: boolean;
  isSessionActivated: boolean;
  isTimerActive: boolean;
  timeRemaining: number;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  clearState: () => Promise<void>;
}
```

## Message Flow

### 1. Patient Sends Message

```
Patient types message → WebRTC sends to server → Server detects patient message → Timer starts (90s) → UI updates
```

### 2. Doctor Responds

```
Doctor types message → WebRTC sends to server → Server detects doctor message → Timer stops → Session activates → UI updates
```

### 3. Timer Expires

```
90 seconds pass → Timer expires → Session marked as expired → UI shows expiration message
```

## WebRTC Server Events

The server sends these events to clients:

- `doctor-response-timer-started` - Timer started
- `doctor-response-timer-stopped` - Timer stopped (doctor responded)
- `session-activated` - Session activated
- `session-expired` - Session expired (timer ran out)

## State Management

The system automatically persists state using AsyncStorage:

- Timer state (active, remaining time)
- Message flags (patient sent, doctor responded)
- Session activation status

State is restored when the app reconnects.

## Error Handling

The system includes comprehensive error handling:

- Connection failures with auto-reconnection
- Message parsing errors
- Timer management errors
- State persistence errors

## Debugging

Enable debug mode by setting `__DEV__ = true` in your app. This will show:

- Connection status
- Timer state
- Message detection status
- Debug controls

## Testing

Use the provided test components to verify functionality:

```typescript
import InstantSessionIntegration from '../components/InstantSessionIntegration';

<InstantSessionIntegration
  sessionId="123"
  appointmentId="text_session_123"
  patientId={456}
  doctorId={789}
  authToken="your-token"
  onSessionActivated={() => console.log('Activated')}
  onSessionExpired={() => console.log('Expired')}
/>
```

## Troubleshooting

### Common Issues

1. **Timer not starting**: Check if patient message is being detected
2. **Timer not stopping**: Verify doctor message detection
3. **Connection issues**: Check WebRTC server URL and network
4. **State not persisting**: Verify AsyncStorage permissions

### Debug Steps

1. Check console logs for detection messages
2. Verify WebRTC server is running
3. Test with debug components
4. Check network connectivity

## Performance Considerations

- Timer updates every second when active
- State is saved to AsyncStorage on changes
- WebSocket connection is lightweight
- Auto-reconnection prevents memory leaks

## Security

- All messages go through authenticated WebRTC channels
- Auth tokens are required for API calls
- State is stored locally (not sensitive data)
- WebSocket connections are secure (WSS in production)

## Future Enhancements

- Configurable timer duration
- Multiple timer types (urgent, normal)
- Push notifications for timer events
- Analytics and reporting
- Custom UI themes
