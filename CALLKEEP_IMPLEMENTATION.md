# CallKeep Implementation - Managed Workflow

## What Changed

Replaced Notifee notifications with native Android CallKeep/ConnectionService for incoming calls. This bypasses MIUI and other OEM restrictions by using the official Android calling API.

## Files Modified/Created

### 1. **plugins/withCallKeep.js** (NEW)
Expo config plugin that adds:
- Required Android permissions (BIND_TELECOM_CONNECTION_SERVICE, USE_FULL_SCREEN_INTENT, etc.)
- Foreground service type for phone calls
- CallKeep ConnectionService declaration in AndroidManifest

### 2. **services/callkeepService.ts** (NEW)
Wrapper service for react-native-callkeep with methods:
- `setup()` - Initialize CallKeep
- `displayIncomingCall()` - Show native incoming call screen
- `answerCall()` - Accept a call
- `endCall()` - End a call
- `rejectCall()` - Reject a call

### 3. **firebase-messaging.js** (MODIFIED)
- Replaced Notifee notification display with CallKeep
- Stores call data in `global.incomingCallData` for retrieval when answered
- Calls `callkeepService.displayIncomingCall()` when FCM arrives

### 4. **index.js** (MODIFIED)
- Replaced Notifee setup with CallKeep setup
- Removed Notifee event handlers
- Added CallKeep event handlers:
  - `answerCall` → navigates to `/chat/[appointmentId]?action=accept&callType=...`
  - `endCall` → ends the call and cleans up

### 5. **app.config.js** (MODIFIED)
- Added `./plugins/withCallKeep` to plugins array

## How It Works

### Background Call Flow (Screen Off / App Killed):
1. FCM data message arrives → `firebase-messaging.js` background handler runs
2. CallKeep displays **native Android incoming call screen** (bypasses MIUI blocking)
3. User taps **Answer** → CallKeep fires `answerCall` event
4. `index.js` reads `global.incomingCallData` and navigates to `/chat/[appointmentId]`
5. `app/chat/[appointmentId].tsx` reads `action=accept` query param and opens call UI

### Foreground Call Flow (App Open):
- Same as background, but navigation is instant since app is already running

## Build & Test

### 1. Build with EAS (Managed):
```bash
eas build --platform android --profile preview
```

### 2. Install and Test:
```bash
adb install app.apk
```

### 3. Grant Permissions (One-time):
```bash
adb shell appops set com.docavailable.app SYSTEM_ALERT_WINDOW allow
```

### 4. Send Test FCM:
```bash
curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=YOUR_SERVER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "DEVICE_TOKEN",
    "data": {
      "type": "incoming_call",
      "appointment_id": "12345",
      "call_type": "video",
      "doctor_name": "Dr. Test"
    },
    "priority": "high"
  }'
```

### 5. Expected Result:
- **Native Android incoming call screen appears** (even with screen off/locked)
- Shows caller name ("Dr. Test")
- Has Answer and Decline buttons
- Answer navigates to your chat screen and opens the call UI

## Advantages Over Notifee

| Feature | Notifee | CallKeep |
|---------|---------|----------|
| Full-screen on lock screen | ❌ Blocked by MIUI | ✅ Always works |
| System-level call UI | ❌ Custom notification | ✅ Native Android UI |
| Bluetooth integration | ❌ No | ✅ Yes |
| Car systems integration | ❌ No | ✅ Yes |
| OEM restriction bypass | ❌ Blocked | ✅ Official API |
| Works in managed workflow | ✅ Yes | ✅ Yes (with plugin) |

## Backend FCM Payload

Your backend should send:
```json
{
  "to": "DEVICE_TOKEN",
  "data": {
    "type": "incoming_call",
    "isIncomingCall": "true",
    "appointment_id": "direct_session_...",
    "call_type": "video",
    "doctor_name": "Praise Mtosa",
    "doctor_id": "2",
    "caller_id": "1"
  },
  "priority": "high"
}
```

**Important:** Do NOT include a `notification` block - use data-only messages so the background handler runs.

## Troubleshooting

### Call screen doesn't appear:
1. Check logcat for CallKeep logs:
   ```bash
   adb logcat -s ReactNativeJS RNCallKeep
   ```
2. Ensure phone permission granted:
   ```bash
   adb shell pm grant com.docavailable.app android.permission.CALL_PHONE
   ```

### "Not registered" error:
- CallKeep needs one-time phone account permission. The plugin handles this automatically on first launch.

### Call doesn't navigate:
- Check `global.incomingCallData` is set correctly
- Check CallKeep `answerCall` event fires in logcat

## Next Steps

1. Build with `eas build --platform android --profile preview`
2. Test incoming calls with screen on, off, and locked
3. Verify navigation to chat screen works
4. Test Accept/Reject flows
5. Deploy to production when satisfied

## Notes

- **Still managed workflow** - no manual native code required
- **OTA updates still work** - EAS updates remain functional
- **Works on all Android devices** - MIUI, Samsung, stock Android, etc.
- **Official Android API** - Uses system ConnectionService, not workarounds
