# Final Solution: Downgrade react-native-callkeep

## The Real Problem

React Native 0.79+ enables **Bridgeless Mode (New Architecture)** by default. The `expo-build-properties` plugin **does NOT successfully override** the `newArchEnabled` flag during EAS cloud builds - the generated `android/gradle.properties` still has `newArchEnabled=true`.

`react-native-callkeep@4.3.16` has duplicate `@ReactMethod` overloads for `displayIncomingCall` which are incompatible with TurboModules.

## Solution Applied

**Downgraded to react-native-callkeep@4.3.12** which may not have the duplicate method issue.

```bash
npm install react-native-callkeep@4.3.12
```

## Next Steps

### 1. Build with EAS
```bash
eas build --platform android --profile preview --clear-cache
```

### 2. Test the new build

After build completes:
```bash
# Uninstall old app
adb uninstall com.docavailable.app

# Install new APK
adb install path/to/new-build.apk

# Watch logs
adb logcat -s ReactNativeJS RNCallKeep
```

### 3. Expected outcomes

**If 4.3.12 works with New Architecture:**
- ✅ No TurboModule errors
- ✅ App launches past splash
- ✅ CallKeep loads successfully

**If 4.3.12 still fails:**
We'll need to either:
- Fork and patch react-native-callkeep to remove duplicate methods
- Switch to a different call library
- Manually commit the `android` folder (bare workflow)

## Why Config Plugins Failed

1. `expo-build-properties` sets flags during prebuild
2. React Native's gradle plugin runs AFTER and overrides with defaults
3. Custom config plugins can't modify files that are regenerated
4. EAS cloud build regenerates `android` folder from scratch each time

## Alternative if Downgrade Doesn't Work

If 4.3.12 still has the issue, the ONLY reliable solution is:

1. Remove `android` from `.gitignore`
2. Manually set `newArchEnabled=false` in `android/gradle.properties`
3. Commit the `android` folder
4. EAS will use committed folder instead of regenerating
5. This makes it a "bare workflow" but is the only way to guarantee the flag

## Status

🟡 **TESTING** - Downgraded to 4.3.12, waiting for EAS build to test
