# Audio Call Setup Guide

## Overview
This guide will help you set up and test the audio call functionality in your DocAvailable app.

## Prerequisites
- React Native development environment set up
- Node.js installed
- Android/iOS device or emulator
- Microphone permissions enabled

## Setup Steps

### 1. Install Dependencies
The required dependencies have already been installed:
- `react-native-webrtc` - WebRTC functionality
- `react-native-permissions` - Permission handling

### 2. Start the Signaling Server
The WebRTC signaling server needs to be running for audio calls to work.

```bash
# Start the signaling server
npm run signaling:start

# Or for development with auto-restart
npm run signaling:dev
```

The server will run on `http://localhost:8080` by default.

### 3. Test the Audio Call Functionality

#### Option 1: Test in Chat Interface
1. Open the app and navigate to any chat
2. Look for the voice/phone icon in the chat header
3. Tap the voice icon to start an audio call
4. Grant microphone permissions when prompted

#### Option 2: Use the Test Component
1. Import and use the `AudioCallTest` component
2. This provides a dedicated test interface

### 4. Verify Permissions

#### Android
Permissions are already configured in `android/app/src/main/AndroidManifest.xml`:
- `RECORD_AUDIO` - For microphone access
- `INTERNET` - For network communication
- `ACCESS_NETWORK_STATE` - For network state monitoring
- `MODIFY_AUDIO_SETTINGS` - For audio settings

#### iOS
Permissions are configured in `app.config.js`:
- Microphone usage description is set

## How It Works

### 1. Call Initiation
- User taps the voice icon in chat
- `AudioCallModal` appears with call options
- User confirms to start the call

### 2. WebRTC Connection
- `AudioCallService` initializes WebRTC peer connection
- Connects to signaling server via WebSocket
- Exchanges offer/answer and ICE candidates
- Establishes peer-to-peer audio connection

### 3. Audio Call Interface
- `AudioCall` component provides the call UI
- Shows call status, duration, and controls
- Mute/unmute and end call functionality

## File Structure

```
services/
├── audioCallService.ts          # WebRTC audio handling
components/
├── AudioCall.tsx               # Main call interface
├── AudioCallModal.tsx          # Call initiation modal
└── AudioCallTest.tsx           # Test component
backend/
├── webrtc-signaling-server.js  # WebSocket signaling server
└── package.json                # Server dependencies
```

## Testing Checklist

- [ ] Signaling server starts without errors
- [ ] App requests microphone permissions
- [ ] Audio call modal appears when voice icon is tapped
- [ ] Call interface loads and shows connection status
- [ ] Mute/unmute functionality works
- [ ] End call functionality works
- [ ] Call duration timer works
- [ ] No console errors during call

## Troubleshooting

### Common Issues

1. **"Signaling server not running"**
   - Make sure to run `npm run signaling:start`
   - Check if port 8080 is available

2. **"Microphone permission denied"**
   - Check device settings for microphone permissions
   - Restart the app after granting permissions

3. **"WebSocket connection failed"**
   - Verify the signaling server is running
   - Check network connectivity
   - Ensure no firewall is blocking port 8080

4. **"No audio during call"**
   - Check device volume settings
   - Verify microphone permissions
   - Test with different devices

### Debug Mode
Enable debug logging by adding this to your app:
```typescript
// In your app's main component
console.log('Audio call debug enabled');
```

## Production Considerations

### Security
- Implement proper authentication for signaling server
- Use HTTPS/WSS in production
- Add rate limiting for signaling messages

### Scalability
- Consider using a dedicated signaling service (e.g., Socket.io)
- Implement TURN servers for better connectivity
- Add call recording and monitoring

### Performance
- Optimize audio codec settings
- Implement call quality monitoring
- Add network condition handling

## Next Steps

1. **Add Video Calls**: Extend the system to support video
2. **Call Recording**: Implement call recording for medical records
3. **Group Calls**: Support multiple participants
4. **Call History**: Track and display call logs
5. **Push Notifications**: Notify users of incoming calls

## Support

If you encounter issues:
1. Check the console logs for error messages
2. Verify all dependencies are installed
3. Test on different devices and networks
4. Check the signaling server logs

## API Reference

### AudioCallService Methods
- `initialize(appointmentId, userId, events)` - Initialize call
- `createOffer()` - Create call offer (for caller)
- `toggleAudio()` - Mute/unmute audio
- `endCall()` - End the call
- `getState()` - Get current call state

### AudioCall Props
- `appointmentId` - Unique appointment identifier
- `userId` - Current user ID
- `isDoctor` - Whether current user is a doctor
- `doctorName` - Doctor's display name
- `patientName` - Patient's display name
- `onEndCall` - Callback when call ends
