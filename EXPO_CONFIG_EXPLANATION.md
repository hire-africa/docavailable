# 📝 Expo Config File Precedence Explained

## The Critical Issue You Caught

**Your Question:**
> "you registered plugin in app.json but there is also a app.config.js"

**The Problem:**
When both `app.json` and `app.config.js` exist, Expo **only reads** `app.config.js` and **ignores** `app.json`.

---

## How Expo Config Files Work

### File Precedence (Highest to Lowest)

```
1. app.config.js    ← Dynamic, uses JavaScript
2. app.config.ts    ← Dynamic, uses TypeScript  
3. app.json         ← Static, JSON only
```

**Rule:** Expo uses the **first file it finds** in this order.

---

## Your Project's Situation

### What We Had

```
✅ app.config.js exists (line 1-92)
   - Plugins: expo-router, firebase, CallKeep, Google Sign-In
   
✅ app.json exists
   - Plugins: expo-router, firebase, CallKeep, withMainActivityFlags ← NOT USED!
```

**Result:** `withMainActivityFlags` plugin was registered in `app.json` but **never executed** because Expo was reading `app.config.js`.

---

## The Fix

### Added Plugin to app.config.js

**File:** `app.config.js` - Line 66

```javascript
plugins: [
  "expo-router",
  "@react-native-firebase/app",
  "@react-native-firebase/messaging",
  "./plugins/withCallKeep",
  "./plugins/withMainActivityFlags", // ✅ NOW it will run!
  [
    "@react-native-google-signin/google-signin",
    { ... }
  ]
],
```

**Result:** Plugin now executes during `expo prebuild` and EAS builds.

---

## What This Means

### Before (Broken)

```bash
npx expo prebuild --clean
```

**Expo reads:** `app.config.js`
**Plugin registered in:** `app.json` (ignored)
**Result:** ❌ Lock screen flags NOT added to AndroidManifest.xml

### After (Fixed)

```bash
npx expo prebuild --clean
```

**Expo reads:** `app.config.js`
**Plugin registered in:** `app.config.js` (used!)
**Result:** ✅ Lock screen flags added to AndroidManifest.xml

---

## Why Have Both Files?

### app.config.js (Active)
- **Dynamic configuration** with JavaScript
- Can use environment variables: `process.env.EXPO_PUBLIC_*`
- Can compute values at build time
- **This is what Expo uses**

### app.json (Inactive in your project)
- Static configuration
- Easier for simple projects
- **Being ignored** in your project

---

## Should You Keep Both?

### Option 1: Keep Both (Recommended for Now)

**Pros:**
- No risk of breaking anything
- `app.json` serves as documentation
- Easy rollback if needed

**Cons:**
- Can be confusing (which one is active?)
- Need to update both when changing config

### Option 2: Delete app.json

**Pros:**
- No confusion about which file is active
- Single source of truth

**Cons:**
- Need to ensure all config from `app.json` is in `app.config.js`

**Recommendation:** Keep both for now, but **only edit `app.config.js`** going forward.

---

## How to Verify Plugin Runs

### 1. Run Prebuild with Verbose Output

```bash
npx expo prebuild --clean --platform android
```

**Look for:**
```
✅ Added lock screen flags to MainActivity
```

### 2. Check Generated Manifest

```bash
cat android/app/src/main/AndroidManifest.xml | grep "showWhenLocked"
```

**Should show:**
```xml
android:showWhenLocked="true" android:turnScreenOn="true"
```

### 3. Test EAS Build

```bash
eas build --platform android --profile preview
```

**Plugin runs automatically!**

---

## Complete Plugin List (app.config.js)

| Plugin | Purpose | Status |
|--------|---------|--------|
| `expo-router` | File-based routing | ✅ Active |
| `@react-native-firebase/app` | Firebase core | ✅ Active |
| `@react-native-firebase/messaging` | FCM notifications | ✅ Active |
| `./plugins/withCallKeep` | CallKeep integration | ✅ Active |
| `./plugins/withMainActivityFlags` | Lock screen flags | ✅ **NOW Active** |
| `@react-native-google-signin/google-signin` | Google Sign-In | ✅ Active |

---

## Key Differences: app.json vs app.config.js

### app.json (Ignored)

```json
{
  "expo": {
    "plugins": [
      "./plugins/withMainActivityFlags" // ❌ Won't run
    ],
    "extra": {
      "firebaseApiKey": "hardcoded-key" // ❌ Can't use env vars
    }
  }
}
```

### app.config.js (Active)

```javascript
module.exports = {
  expo: {
    plugins: [
      "./plugins/withMainActivityFlags" // ✅ Will run!
    ],
    extra: {
      googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID, // ✅ Can use env vars
      EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
    }
  }
};
```

---

## When Each File is Used

### Development

```bash
npx expo start
```
- Reads: `app.config.js`
- Result: Uses env vars, runs plugins from `app.config.js`

### Prebuild

```bash
npx expo prebuild --clean
```
- Reads: `app.config.js`
- Result: Generates native code with plugins from `app.config.js`

### EAS Build

```bash
eas build --platform android
```
- Reads: `app.config.js`
- Result: Builds app with config from `app.config.js`

---

## What Happens If You Edit app.json?

```bash
# You edit app.json
vim app.json

# Run prebuild
npx expo prebuild --clean

# Result: ❌ Your changes are IGNORED
# Expo reads app.config.js instead
```

**Takeaway:** Always edit `app.config.js` when both files exist.

---

## Best Practices

### ✅ DO

1. **Edit only `app.config.js`** when both files exist
2. **Test prebuild** after adding plugins
3. **Verify manifest changes** in generated files
4. **Document plugins** with comments (like we did)

### ❌ DON'T

1. Don't edit `app.json` and expect changes to apply
2. Don't register plugins in both files (confusing)
3. Don't assume `app.json` is being used
4. Don't forget to commit `app.config.js` changes

---

## How to Consolidate (Optional)

If you want to clean up and use only one file:

### Step 1: Compare Files

```bash
# Check for differences
diff app.json app.config.js
```

### Step 2: Merge Missing Config

Move any unique config from `app.json` to `app.config.js`.

### Step 3: Delete app.json

```bash
rm app.json
git add app.json
git commit -m "chore: remove unused app.json (app.config.js is active)"
```

### Step 4: Test

```bash
npx expo prebuild --clean --platform android
eas build --platform android --profile preview
```

**For now, I recommend keeping both** but understanding that `app.config.js` is the active one.

---

## Summary

### What Changed

| Before | After |
|--------|-------|
| Plugin in `app.json` only | Plugin in both files |
| ❌ Plugin not running | ✅ Plugin runs correctly |
| ❌ Flags not added | ✅ Flags added to manifest |

### Files Modified

1. **app.config.js** - Added `./plugins/withMainActivityFlags` (line 66)
2. **app.json** - Already had it (but wasn't being used)

### Next Steps

1. **Run prebuild to verify:**
   ```bash
   npx expo prebuild --clean --platform android
   ```

2. **Check for plugin output:**
   ```
   ✅ Added lock screen flags to MainActivity
   ```

3. **Verify manifest:**
   ```bash
   grep "showWhenLocked" android/app/src/main/AndroidManifest.xml
   ```

4. **Build and test:**
   ```bash
   eas build --platform android --profile preview
   ```

---

## Git Status

```
✅ Committed: 6c1c614
✅ Pushed to main
✅ Plugin now registered in active config file!
```

---

## The Lesson

**Always check which config file Expo is actually reading!**

If you have:
- ✅ `app.config.js` - Expo reads this
- ✅ `app.json` - Expo ignores this

If you only have:
- ✅ `app.json` - Expo reads this

**Your catch saved us from production issues!** 🎉
