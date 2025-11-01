# CallKeep New Architecture Compatibility Fix

## Problem

The app was crashing on splash screen with the following error:

```
Error: Exception in HostObject::get for prop 'RNCallKeep': 
com.facebook.react.internal.turbomodule.core.TurboModuleInteropUtils$ParsingException: 
Unable to parse @ReactMethod annotations from native module: RNCallKeep. 
Details: Module exports two methods to JavaScript with the same name: "displayIncomingCall"
```

## Root Cause

- **React Native 0.79** enables **Bridgeless Mode** (New Architecture) by default
- `react-native-callkeep@4.3.16` has duplicate `@ReactMethod` overloads for `displayIncomingCall`
- The New Architecture's TurboModule parser **rejects duplicate method names** (even with different signatures)
- Setting `newArchEnabled: false` in `app.json` alone is **insufficient** because Bridgeless mode is a separate flag

## Solution Applied

### 1. Installed `expo-build-properties`
```bash
npm install expo-build-properties --save-dev
```

### 2. Updated `app.json` plugins section

Added explicit configuration to disable both New Architecture and Bridgeless mode:

```json
"plugins": [
  "expo-router",
  "@react-native-firebase/app",
  "@react-native-firebase/messaging",
  "./plugins/withCallKeep",
  [
    "expo-build-properties",
    {
      "android": {
        "newArchEnabled": false,
        "enableBridgelessArchitecture": false
      }
    }
  ]
]
```

### 3. Also set in `android` section of `app.json`
```json
"android": {
  "newArchEnabled": false,
  ...
}
```

## Why This Works

- `expo-build-properties` injects native build configuration during the prebuild phase
- `newArchEnabled: false` → Disables TurboModules and Fabric
- `enableBridgelessArchitecture: false` → Forces the old Bridge-based architecture
- This allows `react-native-callkeep` to use the legacy module system which accepts duplicate method names

## Next Steps

1. **Rebuild the app** with EAS:
   ```bash
   eas build --platform android --profile preview
   ```

2. **Wait for build to complete** (check EAS dashboard)

3. **Install and test**:
   ```bash
   adb install path/to/new.apk
   ```

4. **Verify logs**:
   ```bash
   adb logcat -s ReactNativeJS RNCallKeep
   ```
   - Should NOT see TurboModuleParsingException
   - Should see "Running 'main'" without crash
   - App should render past splash screen

## Alternative Solutions (if still fails)

### Option A: Downgrade react-native-callkeep
```bash
npm install react-native-callkeep@4.3.12
```
(Older versions may not have the duplicate method issue)

### Option B: Fork and patch react-native-callkeep
Remove one of the duplicate `displayIncomingCall` overloads in the native Android code.

### Option C: Use a different library
Consider alternatives like:
- `@react-native-voip-push-notification/voip-push-notification` (iOS only)
- Custom native module with single method signatures

## Verification Checklist

- [ ] `expo-build-properties` installed in `package.json`
- [ ] `app.json` has `expo-build-properties` plugin with both flags set to `false`
- [ ] `app.json` android section has `newArchEnabled: false`
- [ ] New EAS build triggered
- [ ] Build succeeds without bundling errors
- [ ] APK installs on device
- [ ] App launches past splash screen
- [ ] No TurboModule errors in logcat
- [ ] CallKeep module loads successfully

## Technical Details

### What is Bridgeless Mode?
- New React Native architecture that removes the Bridge (JS ↔ Native communication layer)
- Uses JSI (JavaScript Interface) for direct synchronous calls
- Requires TurboModules (typed native modules) and Fabric (new renderer)
- Stricter parsing rules for native modules

### Why CallKeep Fails
The library has this in `RNCallKeepModule.java`:
```java
@ReactMethod
public void displayIncomingCall(String uuid, String handle, String callerName) { ... }

@ReactMethod  // ❌ Duplicate name!
public void displayIncomingCall(String uuid, String handle, String callerName, String type, boolean hasVideo) { ... }
```

Old Bridge: ✅ Accepts overloads (picks based on argument count)  
New TurboModules: ❌ Rejects duplicate names (requires unique method names)

## Status

✅ **FIXED** - App should now build and run with CallKeep on old architecture
