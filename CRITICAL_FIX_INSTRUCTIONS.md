# CRITICAL: CallKeep New Architecture Fix - Manual Steps Required

## Problem
`expo-build-properties` plugin is **NOT applying** the `newArchEnabled=false` flag during EAS builds. The generated `android/gradle.properties` still has `newArchEnabled=true`, causing the TurboModule error.

## Root Cause
EAS prebuild regenerates the `android` folder from scratch and doesn't respect the `expo-build-properties` plugin configuration for the `newArchEnabled` flag in some cases.

## Solution: Commit Native Android Folder

Since `expo-build-properties` isn't working, we need to **commit the native `android` folder** with the correct configuration so EAS uses it instead of regenerating.

### Step 1: Verify gradle.properties is correct

Check `android/gradle.properties` line 39:
```properties
newArchEnabled=false
```

✅ Already fixed in your local copy.

### Step 2: Remove android from .gitignore

Edit `.gitignore` and comment out or remove:
```
# android/
# ios/
```

### Step 3: Commit the android folder
```bash
git add android/
git commit -m "fix: disable New Architecture for CallKeep compatibility"
git push
```

### Step 4: Rebuild with EAS
```bash
eas build --platform android --profile preview --clear-cache
```

The `--clear-cache` flag ensures EAS doesn't use cached prebuild artifacts.

### Step 5: Verify in build logs

Watch for this in the EAS build logs:
```
✔ Skipped running `npx expo prebuild` because the android directory already exists.
```

This confirms EAS is using your committed `android` folder instead of regenerating it.

### Step 6: Install and test
```bash
# Wait for build to complete
# Download APK from EAS dashboard

adb uninstall com.docavailable.app
adb install path/to/new-build.apk

# Check logs
adb logcat -s ReactNativeJS RNCallKeep
```

You should **NOT** see:
- ❌ "TurboModuleInteropUtils ParsingException"
- ❌ "Module exports two methods with the same name: displayIncomingCall"

You should see:
- ✅ "Running 'main'"
- ✅ App renders past splash screen

## Alternative: Use eas.json build config

If you don't want to commit the `android` folder, you can try adding this to `eas.json`:

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleRelease -PnewArchEnabled=false"
      }
    }
  }
}
```

But this is less reliable than committing the folder.

## Why expo-build-properties Failed

The plugin should inject the flags during prebuild, but there's a known issue where:
1. React Native 0.79+ defaults to `newArchEnabled=true`
2. The plugin runs after the default is set
3. The plugin's config doesn't always override the default in all scenarios

## Verification Checklist

- [ ] `android/gradle.properties` has `newArchEnabled=false`
- [ ] `android` folder is committed to git
- [ ] EAS build triggered with `--clear-cache`
- [ ] Build logs show "Skipped running npx expo prebuild"
- [ ] New APK installed on device
- [ ] No TurboModule errors in logcat
- [ ] App launches past splash screen

## Status

🔴 **BLOCKED** - Waiting for you to commit `android` folder and rebuild
