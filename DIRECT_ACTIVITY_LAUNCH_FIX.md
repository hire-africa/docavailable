# Direct Activity Launch Fix 🔥

## The Problem

Notifee's `fullScreenAction` with `launchActivity` parameter is **not reliably launching the IncomingCallActivity**. This is why you hear the ringtone but the screen doesn't wake up.

---

## The Solution: Native Module Bridge

I've created a **native module** that directly launches the `IncomingCallActivity` from JavaScript, bypassing Notifee's unreliable fullScreenAction.

---

## What Was Added

### 1. **IncomingCallModule.kt** - Native Module
**Location:** `android/app/src/main/java/com/docavailable/app/IncomingCallModule.kt`

Exposes a method to JavaScript:
```kotlin
@ReactMethod
fun launchIncomingCallActivity() {
    val intent = Intent(context, IncomingCallActivity::class.java)
    intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
    context.startActivity(intent)
}
```

### 2. **IncomingCallPackage.kt** - Package Registration
**Location:** `android/app/src/main/java/com/docavailable/app/IncomingCallPackage.kt`

Registers the native module with React Native.

### 3. **MainApplication.kt** - Package Added
**Location:** `android/app/src/main/java/com/docavailable/app/MainApplication.kt`

Added to `getPackages()`:
```kotlin
packages.add(IncomingCallPackage())
```

### 4. **index.js** - Direct Launch
**Location:** `index.js`

Now calls the native module directly:
```javascript
if (IncomingCallModule) {
  IncomingCallModule.launchIncomingCallActivity();
}
```

---

## 🚀 How to Test

### 1. Rebuild (REQUIRED!)

```bash
cd android
./gradlew clean
cd ..
npm run android
```

### 2. Monitor Logs

Run the debug script:
```bash
.\debug-incoming-call.bat
```

Keep this window open and send a test call.

### 3. What You Should See

**In logs:**
```
📱 [Background] Incoming call - launching native activity
📱 [Background] Calling IncomingCallModule.launchIncomingCallActivity()
IncomingCallModule: Launching IncomingCallActivity...
IncomingCallModule: IncomingCallActivity launched successfully
IncomingCallActivity: onCreate: Screen wake flags set
IncomingCallActivity: onResume: WakeLock acquired - screen should wake now!
```

**On device:**
- Screen wakes up ✅
- Full brightness ✅
- App loads ✅

---

## 🔍 Debugging

### If logs show "IncomingCallModule not available"

**Problem:** Native module not registered

**Fix:**
1. Check `MainApplication.kt` has `packages.add(IncomingCallPackage())`
2. Rebuild: `cd android && ./gradlew clean && cd .. && npm run android`
3. Restart Metro: `npm start -- --reset-cache`

### If logs show "Failed to launch IncomingCallActivity"

**Problem:** Activity not registered or wrong package name

**Fix:**
1. Check `AndroidManifest.xml` has `<activity android:name=".IncomingCallActivity" />`
2. Verify package name matches: `com.docavailable.app`
3. Rebuild

### If activity launches but screen doesn't wake

**Problem:** WakeLock not acquired

**Fix:**
1. Check `WAKE_LOCK` permission in AndroidManifest.xml ✅ (already there)
2. Check logs for "WakeLock acquired" message
3. Try disabling battery optimization again

---

## 📊 Flow Comparison

### Before (Notifee fullScreenAction):
```
FCM → Background Handler → Notifee.displayNotification()
→ fullScreenAction: { launchActivity: '...' }
→ ❌ Activity not launched (Notifee bug)
→ ❌ Screen stays off
```

### After (Direct Native Launch):
```
FCM → Background Handler → IncomingCallModule.launchIncomingCallActivity()
→ Native Intent → IncomingCallActivity.onCreate()
→ WakeLock.acquire() → ✅ Screen wakes up!
```

---

## 🎯 Why This Works

**The Issue:**
- Notifee's `fullScreenAction` uses `PendingIntent`
- PendingIntent may be delayed or ignored by Android
- Some devices don't honor fullScreenAction at all

**The Fix:**
- Direct `startActivity()` call from native code
- Immediate execution (no PendingIntent delay)
- Activity launches with `FLAG_ACTIVITY_NEW_TASK`
- WakeLock acquired in `onResume()` → Screen wakes!

---

## ✅ Expected Result

After rebuilding:
1. **Close app** (swipe away)
2. **Lock screen**
3. **Send test call**
4. **Within 1-2 seconds:**
   - ✅ Logs show "IncomingCallActivity launched"
   - ✅ Logs show "WakeLock acquired"
   - ✅ Screen turns on
   - ✅ App loads with call screen

---

## 📝 Summary

**Files Added:**
- ✅ `IncomingCallModule.kt` - Native bridge
- ✅ `IncomingCallPackage.kt` - Package registration
- ✅ `debug-incoming-call.bat` - Debug script

**Files Modified:**
- ✅ `MainApplication.kt` - Registered package
- ✅ `index.js` - Direct native call

**Next Step:**
```bash
cd android && ./gradlew clean && cd .. && npm run android
```

Then test with `.\debug-incoming-call.bat` running!

---

**This bypasses Notifee's limitations and directly controls the activity launch! 🔥**
