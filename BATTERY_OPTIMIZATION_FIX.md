# Fix: Screen Doesn't Wake Up (Display Permission Already Enabled)

## Current Status
- ✅ **Display over other apps**: ENABLED
- ✅ **Ringtone plays**: Audio working
- ✅ **Notification delivered**: FCM working
- ❌ **Screen doesn't wake up**: Blocked by battery optimization

---

## 🎯 The Issue

If "Display over other apps" is already enabled but the screen still doesn't wake up, the issue is **battery optimization**.

Android's battery optimizer prevents apps from waking the device to save battery, even if you've granted display permissions.

---

## ⚡ Solution: Disable Battery Optimization

### Step 1: Open Battery Settings

```
Settings → Apps → DocAvailable → Battery
```

### Step 2: Select "Unrestricted"

You'll see 3 options:
- ❌ **Optimized** (default) - Restricts background activity
- ⚠️ **Optimized (with exceptions)** - Still restricts
- ✅ **Unrestricted** - ← SELECT THIS ONE

**OR**

If you see "Battery optimization":
1. Tap **Battery optimization**
2. Tap **All apps** at the top
3. Find **DocAvailable**
4. Select **Don't optimize**

---

## 📱 Android Version-Specific Steps

### Android 12+ (Critical!)

Android 12 requires an additional permission:

```
Settings → Apps → DocAvailable 
→ Special app access 
→ Alarms & reminders
→ Toggle ON ✅
```

Without this, notifications can't wake the device even with unrestricted battery.

### Android 13+

Also check:
```
Settings → Apps → DocAvailable
→ Special app access
→ Schedule exact alarms
→ Allow
```

---

## 🏭 Manufacturer-Specific Fixes

### Samsung Galaxy
```
Settings → Apps → DocAvailable
→ Battery → Allow background activity → ON
→ Mobile data → Allow background data → ON
```

Also:
```
Settings → Battery → Background usage limits
→ Make sure DocAvailable is NOT in "Sleeping apps" or "Deep sleeping apps"
```

### Xiaomi / Redmi / POCO
```
Settings → Apps → Manage apps → DocAvailable
→ Autostart → ON ✅
→ Battery saver → No restrictions ✅
→ Display pop-up windows while running in background → ON ✅
```

Also:
```
Security → Battery → Battery optimization
→ Don't optimize DocAvailable
```

### Huawei / Honor
```
Settings → Apps → DocAvailable
→ Battery → App launch → Manage manually
→ Enable ALL three:
  - Auto-launch ✅
  - Secondary launch ✅
  - Run in background ✅
```

### OnePlus / Oppo / Realme
```
Settings → Apps → DocAvailable
→ Battery → App battery usage → Don't optimize
→ Startup manager → Allow background running
```

### Vivo
```
Settings → Apps → DocAvailable
→ Background running → Allow background running
→ Autostart → Allow autostart
→ Battery → High background power consumption → Allow
```

---

## 🧪 Testing After Fix

1. **Disable battery optimization** (see above)
2. **Rebuild the app** (optional):
   ```bash
   npm run android
   ```
3. **Close app completely** (swipe away)
4. **Lock your screen** (press power button)
5. **Send test call**
6. **Screen should wake up!** ✅

---

## 🔍 Verify Settings with ADB

Run the diagnostic script:
```bash
.\check-permissions.bat
```

Look for:
- ✅ **Display over other apps**: "allow"
- ✅ **Battery optimization**: "allow" or in whitelist
- ✅ **Schedule exact alarms** (Android 12+): "allow"

---

## ⚠️ Common Gotchas

### 1. "I disabled battery optimization but it still doesn't work"

**Check these:**
- Some manufacturers have MULTIPLE battery settings
- Samsung: Check "Sleeping apps" list
- Xiaomi: Check "Autostart" AND "Battery saver"
- Huawei: Check "App launch" AND "Protected apps"

### 2. "Works sometimes but not always"

**This means:**
- Battery optimization is partially enabled
- Device is in "Deep sleep" mode
- Background data is restricted

**Fix:**
- Set battery to "Unrestricted" (not just "Optimized with exceptions")
- Enable "Background data" in app settings
- Add app to "Protected apps" (manufacturer-specific)

### 3. "Screen wakes up after 5-10 seconds"

**This is because:**
- Device was in deep sleep (Doze mode)
- FCM took time to wake the device
- Battery optimization delayed the notification

**Fix:**
- Disable battery optimization completely
- Android 12+: Enable "Alarms & reminders"
- Some delay (1-3 seconds) is normal

---

## 🎯 Expected Behavior After Fix

### Before:
- ❌ Hear ringtone, but screen stays black
- ❌ Have to press power button to see notification
- ⚠️ Notification appears in notification tray only

### After:
- ✅ Screen wakes up automatically
- ✅ Full-screen call notification appears
- ✅ Shows over lock screen
- ✅ Can answer/decline immediately
- ✅ Works even in deep sleep

---

## 📊 Quick Checklist

Ensure ALL of these are checked:

- [ ] ✅ Display over other apps → ON
- [ ] ✅ Battery → Unrestricted (or Don't optimize)
- [ ] ✅ Background data → Allowed
- [ ] ✅ Autostart → ON (Xiaomi/Huawei/Vivo)
- [ ] ✅ NOT in "Sleeping apps" list (Samsung)
- [ ] ✅ NOT in "Restricted apps" list
- [ ] ✅ Alarms & reminders → ON (Android 12+)
- [ ] ✅ Schedule exact alarms → Allowed (Android 13+)

---

## 🔧 Troubleshooting

### Check Current Battery Optimization Status

```bash
# Run diagnostic
.\check-permissions.bat

# Or check manually
adb shell cmd appops get com.docavailable.app RUN_IN_BACKGROUND
```

**Should output:** `allow`  
**If it says:** `deny` or `default` → Battery optimization is ENABLED

### Force Remove from Battery Optimization (Developer)

```bash
# Open battery optimization settings directly
adb shell am start -a android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS

# Or open app-specific battery settings
adb shell am start -a android.intent.action.POWER_USAGE_SUMMARY
```

Then manually disable optimization for DocAvailable.

---

## 💡 Why This Happens

Android's battery optimization is designed to:
- Save battery life
- Prevent apps from draining power in background
- Restrict wake-ups when device is sleeping

**However**, it also prevents legitimate wake-ups like incoming calls!

This is why apps like WhatsApp, Telegram, and Messenger ALL require:
1. Display over other apps permission ✅ (you have this)
2. Unrestricted battery usage ❌ (this is missing)

---

## 🚀 Quick Test

After disabling battery optimization:

1. **Close app** (swipe away from recent apps)
2. **Wait 1 minute** (let device go to sleep)
3. **Lock screen** (press power button)
4. **Send test call**
5. **Count to 3**
6. **Screen should turn on** ✅

If it still doesn't work after 3 seconds, check manufacturer-specific settings above.

---

**Bottom line: Disable "Battery optimization" and enable "Unrestricted" battery usage. That's the missing piece! 🔋**
