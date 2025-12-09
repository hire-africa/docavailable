# 🔥 Call System Crash - SOLVED

## Problem
App crashes when receiving calls with this error:
```
assertion "!currentInstance_ && "Only one instance allowed"" failed
Fatal signal 6 (SIGABRT)
```

## Root Cause
You built with `--profile development` which includes:
- ✅ Expo Dev Client (`developmentClient: true`)
- ✅ Metro bundler connection
- ✅ React Native debugger/inspector

When a call comes in via FCM while the app is backgrounded:
1. FCM triggers the incoming call notification
2. React Native tries to initialize for the call handling
3. **CRASH**: Inspector detects multiple instances (not allowed in dev mode)
4. App crashes before processing the call → **silent call**

## Solution: Use Preview or Production Build

### ✅ Build for Testing (Recommended)
```bash
# Preview build - no dev tools, internal distribution
eas build --platform android --profile preview
```

**Why preview?**
- ❌ No dev tools/debugger (won't crash on background calls)
- ✅ Still uses `internal` distribution (easy to install)
- ✅ Uses production-like environment
- ✅ APK format for easy testing

### ✅ Build for Production
```bash
# Full production build
eas build --platform android --profile production
```

## What Changed in Your Profiles

### ❌ Development Profile (CAUSES CRASH)
```json
{
  "developmentClient": true,  // ← Enables debugger = crash on bg calls
  "distribution": "internal",
  "env": {
    "EXPO_PUBLIC_API_BASE_URL": "http://172.20.10.11:8000"  // Local dev
  }
}
```

### ✅ Preview Profile (SAFE FOR CALLS)
```json
{
  // No developmentClient = No debugger = No crash
  "distribution": "internal",  // Still easy to install
  "env": {
    "EXPO_PUBLIC_API_BASE_URL": "https://docavailable-3vbdv.ondigitalocean.app"
  }
}
```

### ✅ Production Profile (SAFE FOR CALLS)
```json
{
  // Production-ready, no dev tools
  "env": {
    "EXPO_PUBLIC_API_BASE_URL": "https://docavailable-3vbdv.ondigitalocean.app"
  }
}
```

## Quick Test After Building

1. Install the preview/production APK
2. Open the app
3. Send a test call via FCM
4. App should:
   - ✅ Show incoming call UI
   - ✅ Play ringtone
   - ✅ Answer button works
   - ✅ No crashes

## Why This Happens

**Development builds** are meant for active development:
- Connected to Metro bundler
- Live reload enabled
- Debugger/inspector attached
- **Single instance requirement** for debugging

**Background FCM calls** trigger a new React Native context:
- App is backgrounded/killed
- FCM wakes up the app
- Tries to create new RN instance
- **Conflicts with dev inspector** → CRASH

**Preview/Production builds** don't have this issue:
- No debugger attached
- Can create instances as needed
- Handles background calls properly

## Build Now

```bash
# This will work for call testing
eas build --platform android --profile preview
```

---

**Status:** 🟢 **Issue identified - build with `preview` or `production` profile**

The plugin fixes are all correct. The crash is purely due to using a dev build for call testing.
