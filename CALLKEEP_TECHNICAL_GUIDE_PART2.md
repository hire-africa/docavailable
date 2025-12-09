# CallKeep Implementation - Technical Guide (Part 2)
## Complete Call Flow & Screen-Off Behavior

---

## Table of Contents - Part 2
1. [Complete Call Flow](#complete-call-flow)
2. [Screen-Off & Locked Phone Deep Dive](#screen-off--locked-phone-deep-dive)
3. [Why CallKeep Bypasses MIUI](#why-callkeep-bypasses-miui)
4. [Troubleshooting Guide](#troubleshooting-guide)

**See Part 1 for:** Build process and config plugin system

---

## Complete Call Flow

### Step-by-Step: Backend to Call Screen

```
Backend → FCM → Device → CallKeep → Chat Screen
  (1)     (2)     (3)       (4)        (5)
```

### Step 1: Backend Sends FCM

```javascript
// Your backend sends data-only message
const message = {
  token: deviceFcmToken,
  data: {
    type: 'incoming_call',
    appointment_id: 'session_123',
    call_type: 'video',
    doctor_name: 'Dr. Smith'
  },
  android: { priority: 'high' }
};

await admin.messaging().send(message);
```

### Step 2: FCM Delivers

Google Play Services receives message and wakes your app's background handler.

### Step 3: Background Handler

```javascript
// firebase-messaging.js
messaging().setBackgroundMessageHandler(async remoteMessage => {
  const data = remoteMessage?.data;
  
  if (data.type === 'incoming_call') {
    const callId = uuidv4();
    
    // Store globally (only way to pass data)
    global.incomingCallData = {
      callId,
      appointmentId: data.appointment_id,
      callType: data.call_type,
      callerName: data.doctor_name
    };
    
    // Trigger native call UI
    await callkeepService.displayIncomingCall(
      callId,
      data.doctor_name,
      data.appointment_id,
      data.call_type
    );
  }
});
```

### Step 4: CallKeep Shows UI

```typescript
// services/callkeepService.ts
async displayIncomingCall(callId, callerName, appointmentId, callType) {
  await this.setup();
  
  // Cross React Native bridge to Java
  RNCallKeep.displayIncomingCall(
    callId,
    appointmentId,  // Handle
    callerName,
    'generic',
    callType === 'video'  // hasVideo
  );
}
```

**Native side (VoiceConnectionService.java):**
```java
public void displayIncomingCall(...) {
  TelecomManager tm = getSystemService(TELECOM_SERVICE);
  
  Bundle extras = new Bundle();
  extras.putString("CALLER_NAME", callerName);
  extras.putBoolean("HAS_VIDEO", hasVideo);
  
  // Registers with Android system
  tm.addNewIncomingCall(phoneAccountHandle, extras);
}
```

**Android System UI displays full-screen incoming call.**

### Step 5: User Accepts → Navigate

```javascript
// index.js
RNCallKeep.addEventListener('answerCall', ({ callUUID }) => {
  const callData = global.incomingCallData;
  
  if (callData) {
    const path = `/chat/${callData.appointmentId}?action=accept&callType=${callData.callType}`;
    
    setTimeout(() => {
      router.push(path);
    }, 300);
  }
});
```

**Chat screen auto-opens call UI based on query params.**

---

## Screen-Off & Locked Phone Deep Dive

### The Critical Question

**How does CallKeep show incoming call UI when phone is completely OFF and LOCKED?**

---

### Timeline: OFF → Call UI Showing

```
T+0ms     Phone OFF, locked, app killed
T+100ms   FCM message arrives at device
T+150ms   Google Play Services wakes app
T+200ms   Background handler executes
T+250ms   CallKeep native module called
T+300ms   TelecomManager registers call
T+350ms   System UI receives notification
T+400ms   PowerManager wakes screen
T+500ms   Full-screen call UI visible
```

---

### Detailed Walkthrough

#### Initial State: Phone Completely OFF

```
Device State:
├── Screen: OFF (black, no backlight)
├── Lock: Enabled
├── CPU: Doze mode (sleeping)
├── Your App: KILLED (not in memory)

Still Running:
├── Android System Server
├── Google Play Services
└── FCM persistent socket connection
```

---

#### T+100ms: FCM Arrives

```
Google Play Services (always running)
├── Receives FCM packet over network
├── Parses: com.docavailable.app
├── Acquires: PARTIAL_WAKE_LOCK (keep CPU awake)
└── Spawns: Your app process in background
```

**Wake lock ensures CPU stays awake for message processing, but screen stays OFF.**

---

#### T+200ms: Background Handler Runs

```
Your App Process (headless, no UI)
├── JavaScript engine starts
├── firebase-messaging.js handler executes
├── Parses FCM data
├── Generates call ID
├── Stores global.incomingCallData
└── Calls: callkeepService.displayIncomingCall()
```

**Screen still OFF at this point.**

---

#### T+250ms: CallKeep Registers with System

```
JavaScript → Bridge → Java
RNCallKeep.displayIncomingCall()
↓
VoiceConnectionService.java
↓
telecomManager.addNewIncomingCall(handle, extras)
```

**This registers the incoming call with Android's TelecomManager (system service).**

---

#### T+350ms: System UI Notified

```
TelecomManager (System Service)
├── Receives: New incoming call
├── From: com.docavailable.app
├── Checks: Is ConnectionService registered? YES
├── Checks: Has required permissions? YES
└── Notifies: Android System UI

System UI (com.android.systemui)
├── Receives: Incoming call notification
├── Checks: Screen state? OFF
├── Checks: Has USE_FULL_SCREEN_INTENT? YES
└── Decision: WAKE SCREEN AND SHOW FULL UI
```

---

#### T+400ms: Screen Wakes

```
PowerManager.newWakeLock(
  PowerManager.SCREEN_BRIGHT_WAKE_LOCK | 
  PowerManager.ACQUIRE_CAUSES_WAKEUP
)

Effects:
├── Screen backlight: ON (full brightness)
├── Display: Active
├── Lock screen: BYPASSED (special permission)
└── Incoming call UI: Rendered
```

**The `ACQUIRE_CAUSES_WAKEUP` flag literally turns the screen ON.**

---

#### T+500ms: User Sees Call

```
┌────────────────────────────────────────┐
│  🔆 Screen is ON                       │
│  🔓 Lock bypassed                      │
│                                        │
│     Incoming Video Call                │
│                                        │
│      Dr. Jane Smith                    │
│                                        │
│   [Profile Picture]                    │
│                                        │
│  ┌──────────┐    ┌──────────┐        │
│  │ DECLINE  │    │  ACCEPT  │        │
│  └──────────┘    └──────────┘        │
└────────────────────────────────────────┘
```

**This is native Android System UI, not your app's UI.**

---

### Key Technical Points

**1. Screen-off doesn't mean "device off"**
- CPU can wake while screen stays off
- Background processes can run
- FCM socket stays connected

**2. Wake lock mechanism**
```
PARTIAL_WAKE_LOCK → CPU awake, screen off
SCREEN_WAKE_LOCK → CPU + screen awake
ACQUIRE_CAUSES_WAKEUP → Forces screen ON
```

**3. System service vs app**
```
Your App:
- Can be killed anytime
- Subject to Doze restrictions
- Limited permissions

TelecomManager (System):
- Always running
- Bypasses Doze
- Can wake screen
- Can bypass lock screen
```

**4. The magic of ConnectionService**
```
Your app → Registers with TelecomManager
TelecomManager → System-level priority
System UI → Full screen power
Result → Cannot be blocked
```

---

## Why CallKeep Bypasses MIUI

### What MIUI Blocks

MIUI and other aggressive OEMs block:

```
❌ Notifications with full-screen intent
   └── Notifee falls victim to this

❌ Apps using SYSTEM_ALERT_WINDOW overlays
   └── Can be disabled by user/system

❌ Background app wake-ups
   └── Battery optimization kills apps

❌ Third-party "call" apps
   └── Unless using official API

❌ Apps in Doze mode
   └── Network and processing limited
```

### What CallKeep Does Differently

**1. Uses Official Platform API**
```
ConnectionService is not a workaround
It IS the official Android calling API
Same API that phone app uses
Google mandates OEMs support it
```

**2. System-Level Registration**
```
Install time:
Android System reads AndroidManifest.xml
Sees: VoiceConnectionService with BIND_TELECOM_CONNECTION_SERVICE
Registers: App as calling app in TelecomManager
Result: System treats your app like phone app
```

**3. Special Permissions**
```
BIND_TELECOM_CONNECTION_SERVICE:
- Only works with ConnectionService
- Grants system-level call permissions
- Allows screen wake
- Allows lock bypass
- OEMs cannot disable (breaks phone functionality)
```

**4. Power Management Exemption**
```
ConnectionService apps are exempt from:
- Doze restrictions
- Background execution limits
- Battery optimization
- App standby

Why? Because phone calls are critical
Your app is now a "phone" app
```

### Comparison

```
┌─────────────────┬──────────────┬──────────────┐
│    Feature      │   Notifee    │   CallKeep   │
├─────────────────┼──────────────┼──────────────┤
│ Notification    │ Yes          │ No           │
│ Full Screen     │ Tries        │ Yes (native) │
│ Lock Bypass     │ No           │ Yes          │
│ MIUI Blocked    │ YES ❌       │ NO ✅        │
│ System API      │ No           │ Yes          │
│ Doze Exempt     │ No           │ Yes          │
│ Screen Wake     │ Sometimes    │ Always       │
└─────────────────┴──────────────┴──────────────┘
```

### MIUI Cannot Block Because:

**1. Breaks phone functionality**
```
If MIUI blocks ConnectionService:
→ All calling apps break
→ Phone app breaks
→ VoIP apps (WhatsApp, Telegram) break
→ Users complain
→ MIUI must support it
```

**2. Google certification requirement**
```
Android Compatibility Definition:
"Device MUST support android.telecom APIs"

If MIUI wants:
- Google Play Store
- Google Services
- Android branding

Then MIUI MUST support ConnectionService
```

**3. Platform-level enforcement**
```
TelecomManager is in system_server process
OEM cannot modify without breaking Android
Even MIUI cannot touch this
```

---

## Troubleshooting Guide

### Common Issues & Solutions

#### Issue 1: Call UI Doesn't Show

**Symptoms:**
- FCM received (logs show)
- Background handler runs
- But no call UI appears

**Check:**
```bash
# 1. Verify permissions granted
adb shell dumpsys package com.docavailable.app | grep permission

Look for:
✅ android.permission.BIND_TELECOM_CONNECTION_SERVICE: granted=true
✅ android.permission.USE_FULL_SCREEN_INTENT: granted=true
```

**Fix:**
```bash
# Grant overlay permission
adb shell appops set com.docavailable.app SYSTEM_ALERT_WINDOW allow

# Grant phone permission
adb shell pm grant com.docavailable.app android.permission.CALL_PHONE
```

---

#### Issue 2: "Phone Account Not Registered"

**Symptoms:**
```
Error: Phone account not registered with TelecomManager
```

**Check:**
```bash
# List registered phone accounts
adb shell dumpsys telecom

Look for: com.docavailable.app
```

**Fix:**
- Reinstall app (account registered at install time)
- Check AndroidManifest has VoiceConnectionService
- Verify BIND_TELECOM_CONNECTION_SERVICE permission present

---

#### Issue 3: Navigation Doesn't Work After Accept

**Symptoms:**
- Call UI shows
- User taps Accept
- Nothing happens

**Check logs:**
```bash
adb logcat -s ReactNativeJS RNCallKeep

Look for:
✅ "answerCall event fired"
✅ "Call data: {...}"
❌ "No call data found" → global.incomingCallData not set
```

**Fix:**
```javascript
// Ensure data stored BEFORE displayIncomingCall
global.incomingCallData = { ... };  // ← Must be here
await callkeepService.displayIncomingCall(...);
```

---

#### Issue 4: Works in Foreground, Not Background

**Symptoms:**
- Call shows when app is open
- Nothing when app is killed

**Check:**
```bash
# Test FCM data-only delivery
adb logcat -s FirebaseMessaging

Look for:
✅ "Received data message"
❌ "Received notification message" → Wrong format
```

**Fix:**
Ensure FCM payload has NO `notification` block:

```javascript
// ❌ WRONG
{
  "notification": { ... },  // ← Remove this
  "data": { ... }
}

// ✅ CORRECT
{
  "data": { ... }  // ← Only data
}
```

---

#### Issue 5: Screen Doesn't Wake

**Symptoms:**
- Notification received
- Handler runs
- Screen stays off

**Check:**
```bash
# Check power management
adb shell dumpsys power

Look for wake locks:
✅ PARTIAL_WAKE_LOCK 'GCM_HB_ALARM'
```

**Verify:**
```bash
# Check if CallKeep is properly configured
adb shell dumpsys package com.docavailable.app | grep -A 20 "Service"

Should show:
VoiceConnectionService
permission=android.permission.BIND_TELECOM_CONNECTION_SERVICE
```

**Fix:**
- Ensure `android:foregroundServiceType="phoneCall"` in manifest
- Verify USE_FULL_SCREEN_INTENT permission in manifest

---

### Testing Checklist

**Local Testing:**
```bash
# 1. Build preview APK
eas build --platform android --profile preview

# 2. Install
adb install app.apk

# 3. Grant permissions
adb shell appops set com.docavailable.app SYSTEM_ALERT_WINDOW allow

# 4. Turn screen off
adb shell input keyevent POWER

# 5. Send test FCM (use your backend or FCM console)

# 6. Monitor logs
adb logcat -s ReactNativeJS RNCallKeep FirebaseMessaging
```

**Expected logs:**
```
FirebaseMessaging: Received data message
ReactNativeJS: BG FCM handler received
ReactNativeJS: Call data stored globally
RNCallKeep: displayIncomingCall called
RNCallKeep: Incoming call registered
[Screen should turn ON here]
```

---

### Verification Commands

```bash
# 1. Check if service is registered
adb shell dumpsys telecom | grep -A 10 "PhoneAccount"

# 2. Check manifest was generated correctly
adb shell dumpsys package com.docavailable.app | grep -A 5 "VoiceConnection"

# 3. Check permissions
adb shell dumpsys package com.docavailable.app | grep -A 50 "permission"

# 4. Test call while screen off
adb shell input keyevent POWER  # Turn off
# Send FCM
# Wait 2 seconds
# Screen should turn ON automatically

# 5. Check if wake lock acquired
adb shell dumpsys power | grep Wake
```

---

## Summary

### How It All Works Together

```
1. EAS Build
   ├── Config plugin runs
   ├── AndroidManifest generated with CallKeep service
   └── APK built with native CallKeep code

2. Install
   ├── Android reads manifest
   ├── Registers VoiceConnectionService with TelecomManager
   └── Grants system-level call permissions

3. Runtime (Screen OFF)
   ├── FCM arrives → Play Services wakes app
   ├── Background handler runs → Calls CallKeep
   ├── CallKeep registers with TelecomManager
   ├── TelecomManager notifies System UI
   ├── System UI wakes screen
   └── Native incoming call UI shows

4. User Interaction
   ├── Accept → CallKeep fires event
   ├── index.js navigates to chat screen
   └── Chat screen opens video call modal
```

### Why It Cannot Be Blocked

```
✅ Official Android API (not a hack)
✅ System-level registration (install time)
✅ Special permissions (BIND_TELECOM_CONNECTION_SERVICE)
✅ Power exemptions (phone calls are critical)
✅ Google certification requirement (OEMs must support)
✅ Same API as phone app (blocking breaks phone)
```

### Key Files Review

```
plugins/withCallKeep.js
└── Adds VoiceConnectionService to manifest
    └── Runs every build
        └── Never overwritten (regenerated)

firebase-messaging.js
└── Background handler
    └── Stores call data
        └── Triggers CallKeep

services/callkeepService.ts
└── Wrapper for RNCallKeep
    └── Calls native module
        └── Crosses to Java

index.js
└── Event listeners
    └── answerCall → Navigate
        └── endCall → Cleanup

app/chat/[appointmentId].tsx
└── Reads query params
    └── action=accept → Opens call UI
        └── Starts WebRTC connection
```

---

**End of Part 2**

You now have complete understanding of:
- ✅ How EAS build generates native code
- ✅ Why config plugin never gets overwritten
- ✅ Complete call flow from backend to screen
- ✅ Exactly how screen-off calls work
- ✅ Why MIUI cannot block CallKeep
- ✅ How to troubleshoot issues

**Ready to build and test!** 🚀
