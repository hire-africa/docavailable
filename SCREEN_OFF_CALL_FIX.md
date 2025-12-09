# Fix: Incoming Calls Not Showing When Screen is Off 📱

## Current Status ✅
- ✅ **Foreground notifications work** - Answer/Decline buttons showing
- ❌ **Screen-off notifications not working** - Need additional setup

---

## Root Cause

On **Android 10+** (especially Android 12+), full-screen intent notifications require **explicit permission** from the user to display over the lock screen. This is a security feature that prevents malicious apps from hijacking the screen.

---

## 🔧 Solution: Enable "Display Over Other Apps"

### Step 1: Open Your Phone Settings

1. **Open Settings** on your Android device
2. Go to **Apps** or **Applications**
3. Find and tap **DocAvailable**

### Step 2: Enable Display Over Other Apps

#### Option A: Via Special App Access
1. In DocAvailable app settings, tap **Advanced** or **⋮ (three dots)**
2. Tap **Special app access** or **Special permissions**
3. Tap **Display over other apps** or **Appear on top**
4. **Toggle ON** for DocAvailable

#### Option B: Direct Settings Path
```
Settings → Apps → DocAvailable → Advanced 
→ Special app access → Display over other apps → Allow
```

### Step 3: Disable Battery Optimization (Important!)

1. In DocAvailable app settings
2. Tap **Battery** or **Battery usage**
3. Tap **Battery optimization**
4. Find **DocAvailable**
5. Select **Don't optimize** or **Unrestricted**

**Why?** Battery optimization can prevent notifications from waking the device when it's in deep sleep.

### Step 4: Enable "Show on Lock Screen"

1. In DocAvailable app settings
2. Tap **Notifications**
3. Find **Incoming Calls** channel
4. Ensure **Show on lock screen** is enabled
5. Set importance to **High** or **Urgent**

---

## 📱 Android Version-Specific Instructions

### Android 12+ (Most Restrictive)
- Must enable "Display over other apps"
- Must disable battery optimization
- May need to enable "Schedule exact alarms" (Settings → Apps → DocAvailable → Special access)

### Android 11
- Enable "Display over other apps"
- Disable battery optimization
- Check "Full-screen intent" in notification settings

### Android 10
- Enable "Display over other apps"
- Ensure notification importance is HIGH

### Android 9 and Below
- Should work without additional setup
- If issues persist, disable battery optimization

---

## 🧪 Testing After Setup

1. **Close your app completely** (swipe away from recent apps)
2. **Turn off your screen** (press power button)
3. **Send a test call** from another device or use backend test
4. **Screen should wake up** and show full-screen incoming call

### Expected Behavior:
✅ Screen turns on automatically  
✅ Full-screen notification appears  
✅ Ringtone plays  
✅ Answer/Decline buttons visible  
✅ Works even if device was locked  

---

## 🔍 Check Your Logs

After enabling permissions, check logs to verify:

```bash
adb logcat | grep -i "FullScreen"
```

You should see:
```
✅ [FullScreen] Already has overlay permission
✅ [FullScreen] All permissions granted!
```

---

## ⚠️ Common Issues & Solutions

### Issue 1: "Permission dialog doesn't appear"
**Solution:** Android doesn't show a dialog for this permission. You must go to Settings manually (see Step 2 above).

### Issue 2: "Screen wakes up but no notification"
**Solution:** 
- Check notification channel importance (must be HIGH)
- Ensure battery optimization is disabled
- Verify "Show on lock screen" is enabled

### Issue 3: "Notification appears in notification tray but no full-screen"
**Solution:**
- Enable "Display over other apps" permission
- Some manufacturers (Samsung, Xiaomi, Huawei) have additional restrictions:
  - **Samsung**: Settings → Apps → DocAvailable → Battery → Allow background activity
  - **Xiaomi**: Settings → Apps → Manage apps → DocAvailable → Autostart → ON
  - **Huawei**: Settings → Apps → DocAvailable → Battery → App launch → Manage manually

### Issue 4: "Works sometimes but not always"
**Solution:**
- Disable battery optimization (this is the #1 cause)
- Enable "Unrestricted" battery usage
- Add app to protected apps list (manufacturer-specific)

### Issue 5: "Notification comes 30+ seconds late"
**Solution:**
- Ensure backend is sending `priority: "high"` in FCM
- Disable Doze mode for your app
- Check network connectivity

---

## 🏭 Manufacturer-Specific Settings

### Samsung Galaxy
1. Settings → Apps → DocAvailable
2. Battery → Allow background activity → ON
3. Mobile data → Allow background data usage → ON
4. Battery optimization → Don't optimize

### Xiaomi / Redmi / POCO
1. Settings → Apps → Manage apps → DocAvailable
2. Autostart → ON
3. Battery saver → No restrictions
4. Display pop-up windows while running in background → ON
5. Show on Lock screen → ON

### Huawei / Honor
1. Settings → Apps → DocAvailable
2. Battery → App launch → Manage manually
3. Enable: Auto-launch, Secondary launch, Run in background
4. Notifications → Allow notifications → Priority display

### OnePlus / Oppo / Realme (ColorOS)
1. Settings → Apps → DocAvailable
2. App battery usage → Don't optimize
3. Startup manager → Allow background running
4. Display over other apps → Allow

### Vivo
1. Settings → Apps → DocAvailable
2. Background running → Allow background running
3. Autostart → Allow autostart
4. Battery → High background power consumption → Allow

---

## 📊 Verification Checklist

Before testing, ensure ALL of these are checked:

- [ ] ✅ Notification permission granted
- [ ] ✅ "Display over other apps" enabled
- [ ] ✅ Battery optimization disabled
- [ ] ✅ "Show on lock screen" enabled
- [ ] ✅ Notification channel importance: HIGH
- [ ] ✅ Autostart enabled (Xiaomi/Huawei/Vivo)
- [ ] ✅ Background activity allowed (Samsung)
- [ ] ✅ App not in "Sleeping apps" list
- [ ] ✅ "Unrestricted" battery usage

---

## 🚀 Quick Setup Command (Developer)

For testing, you can use ADB to verify current permissions:

```bash
# Check if display over other apps is granted
adb shell appops get com.docavailable.app SYSTEM_ALERT_WINDOW

# Expected output: "allow" or "mode: allow"

# Check battery optimization
adb shell dumpsys battery | grep "com.docavailable.app"

# Open app info directly
adb shell am start -a android.settings.APPLICATION_DETAILS_SETTINGS -d package:com.docavailable.app
```

---

## 🎯 Summary

The issue is **NOT with your code** - it's with Android's security restrictions. Modern Android requires explicit user permission for apps to wake the screen and show full-screen notifications.

**Action Required:**
1. Enable "Display over other apps" in Settings
2. Disable battery optimization
3. Test incoming call when screen is off

**After completing these steps, your incoming calls should work perfectly! 📞**

---

## 📞 Still Not Working?

If you've completed all steps above and it still doesn't work:

1. **Check your Android version:**
   ```bash
   adb shell getprop ro.build.version.release
   ```

2. **Check your device manufacturer:**
   ```bash
   adb shell getprop ro.product.manufacturer
   ```

3. **Check logs during incoming call:**
   ```bash
   adb logcat -v time | grep -E "(FullScreen|notifee|FCM|Background)"
   ```

4. **Send the logs to debug** - they will show exactly what's blocking the notification

---

**Need help?** Check the logs and device manufacturer settings above. Most issues are resolved by disabling battery optimization! 🔋
