# CallKeep Implementation - Technical Guide (Part 1)
## Build Process & Config Plugin System

---

## Table of Contents - Part 1
1. [Build Process Deep Dive](#build-process-deep-dive)
2. [Config Plugin System](#config-plugin-system)
3. [Why Plugin Won't Be Overwritten](#why-plugin-wont-be-overwritten)

**See Part 2 for:** Complete call flow and screen-off behavior

---

## Build Process Deep Dive

### EAS Build Process Timeline

When you run `eas build --platform android --profile preview`:

```
┌─────────────────────────────────────────────────────────────┐
│  Phase 1: Upload (0-2 min)                                   │
│  ────────────────────────────────────────────────────────   │
│  • Compress your code                                        │
│  • Upload to EAS servers                                     │
│  • Create build job in queue                                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  Phase 2: Setup (2-3 min)                                    │
│  ────────────────────────────────────────────────────────   │
│  • Allocate clean Ubuntu VM                                  │
│  • Install Node.js, Java, Android SDK                        │
│  • npm install (download all dependencies)                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  Phase 3: Prebuild (3-5 min) ⭐ CONFIG PLUGIN RUNS HERE      │
│  ────────────────────────────────────────────────────────   │
│  • npx expo prebuild                                         │
│  • Read app.config.js                                        │
│  • Execute ALL config plugins in order                       │
│  • Generate android/ and ios/ folders from scratch           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  Phase 4: Native Build (5-15 min)                            │
│  ────────────────────────────────────────────────────────   │
│  • ./gradlew assembleRelease                                 │
│  • Compile Java/Kotlin code                                  │
│  • Link native libraries                                     │
│  • Bundle JavaScript                                         │
│  • Create APK                                                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  Phase 5: Sign & Upload (15-16 min)                          │
│  ────────────────────────────────────────────────────────   │
│  • Sign APK with your credentials                            │
│  • Upload to EAS CDN                                         │
│  • Generate download link & QR code                          │
└─────────────────────────────────────────────────────────────┘
```

---

### Phase 3: Prebuild - Where Magic Happens

#### Before Prebuild Runs
```
Your Project (source control)
├── app/
├── components/
├── services/
├── plugins/
│   └── withCallKeep.js       ← Your config plugin
├── app.config.js              ← References plugin
├── package.json
└── (NO android/ folder in git)
```

#### Prebuild Executes: `npx expo prebuild`

**Step 1: Load Configuration**
```javascript
// EAS loads app.config.js
const config = require('./app.config.js');

// Reads plugins array:
config.expo.plugins = [
  "expo-router",
  "@react-native-firebase/app",
  "@react-native-firebase/messaging",
  "./plugins/withCallKeep",    ← YOUR PLUGIN
  ["@react-native-google-signin/google-signin", {...}]
];
```

**Step 2: Create Base Android Project**
```
Expo generates default Android structure:

android/
├── app/
│   ├── src/
│   │   └── main/
│   │       ├── AndroidManifest.xml  ← EMPTY TEMPLATE
│   │       └── java/
│   ├── build.gradle
│   └── proguard-rules.pro
├── gradle/
├── build.gradle
└── settings.gradle
```

**Step 3: Execute Plugins (IN ORDER)**

```javascript
let modifiedConfig = baseConfig;

// Plugin 1: expo-router
modifiedConfig = expoRouterPlugin(modifiedConfig);
// Adds: MainActivity config, deep linking

// Plugin 2: @react-native-firebase/app
modifiedConfig = firebaseAppPlugin(modifiedConfig);
// Adds: google-services.json reference, Firebase dependencies

// Plugin 3: @react-native-firebase/messaging
modifiedConfig = firebaseMessagingPlugin(modifiedConfig);
// Adds: FirebaseMessagingService to AndroidManifest

// Plugin 4: ./plugins/withCallKeep ⭐ YOUR PLUGIN
modifiedConfig = withCallKeep(modifiedConfig);
// Adds: CallKeep permissions, VoiceConnectionService

// Plugin 5: Google Sign-In
modifiedConfig = googleSignInPlugin(modifiedConfig);
// Adds: OAuth config
```

#### Your Plugin Execution in Detail

```javascript
// plugins/withCallKeep.js
const { withAndroidManifest } = require('@expo/config-plugins');

const withCallKeep = (config) => {
  // This function receives the current config state
  // After plugins 1-3 have already modified it
  
  console.log('🔧 [EAS] CallKeep plugin starting...');
  
  return withAndroidManifest(config, async (config) => {
    // config.modResults contains the AndroidManifest object
    const androidManifest = config.modResults;
    const { manifest } = androidManifest;
    
    console.log('📝 [EAS] Modifying AndroidManifest...');
    
    // ─────────────────────────────────────────────────────────
    // STEP A: Add Permissions
    // ─────────────────────────────────────────────────────────
    const permissions = [
      'android.permission.BIND_TELECOM_CONNECTION_SERVICE',
      'android.permission.FOREGROUND_SERVICE_PHONE_CALL',
      'android.permission.MANAGE_OWN_CALLS',
      // ... more permissions
    ];
    
    permissions.forEach((permission) => {
      if (!manifest['uses-permission'].find(
        (p) => p.$['android:name'] === permission
      )) {
        manifest['uses-permission'].push({
          $: { 'android:name': permission }
        });
        console.log(`  ✓ Added permission: ${permission}`);
      }
    });
    
    // ─────────────────────────────────────────────────────────
    // STEP B: Add CallKeep Service
    // ─────────────────────────────────────────────────────────
    const application = manifest.application[0];
    
    if (!application.service) {
      application.service = [];
    }
    
    const connectionService = {
      $: {
        'android:name': 'io.wazo.callkeep.VoiceConnectionService',
        'android:label': 'DocAvailable',
        'android:permission': 'android.permission.BIND_TELECOM_CONNECTION_SERVICE',
        'android:foregroundServiceType': 'phoneCall',
        'android:exported': 'true'
      },
      'intent-filter': [{
        action: [{
          $: { 'android:name': 'android.telecom.ConnectionService' }
        }]
      }]
    };
    
    // Check if already added (idempotent)
    const exists = application.service.find(
      (s) => s.$?.['android:name'] === 'io.wazo.callkeep.VoiceConnectionService'
    );
    
    if (!exists) {
      application.service.push(connectionService);
      console.log('  ✓ Added VoiceConnectionService');
    }
    
    console.log('✅ [EAS] CallKeep plugin complete');
    
    // Return modified config for next plugin
    return config;
  });
};

module.exports = withCallKeep;
```

**Step 4: Write Final AndroidManifest.xml**

After all plugins run, Expo writes the final manifest:

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<!-- ⚠️ AUTO-GENERATED - DO NOT EDIT MANUALLY ⚠️ -->
<!-- Generated by: npx expo prebuild -->
<!-- Modified by config plugins in app.config.js -->

<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  
  <!-- Permissions from all plugins -->
  <uses-permission android:name="android.permission.INTERNET"/>
  <uses-permission android:name="android.permission.CAMERA"/>
  <uses-permission android:name="android.permission.RECORD_AUDIO"/>
  <!-- ... Firebase permissions ... -->
  
  <!-- CallKeep permissions (from YOUR plugin) -->
  <uses-permission android:name="android.permission.BIND_TELECOM_CONNECTION_SERVICE"/>
  <uses-permission android:name="android.permission.FOREGROUND_SERVICE_PHONE_CALL"/>
  <uses-permission android:name="android.permission.MANAGE_OWN_CALLS"/>
  <uses-permission android:name="android.permission.USE_FULL_SCREEN_INTENT"/>
  
  <application 
    android:name=".MainApplication"
    android:label="@string/app_name">
    
    <!-- Firebase service (from Firebase plugin) -->
    <service android:name="com.google.firebase.messaging.FirebaseMessagingService">
      <intent-filter>
        <action android:name="com.google.firebase.MESSAGING_EVENT"/>
      </intent-filter>
    </service>
    
    <!-- CallKeep service (from YOUR plugin) -->
    <service 
      android:name="io.wazo.callkeep.VoiceConnectionService"
      android:label="DocAvailable"
      android:permission="android.permission.BIND_TELECOM_CONNECTION_SERVICE"
      android:foregroundServiceType="phoneCall"
      android:exported="true">
      <intent-filter>
        <action android:name="android.telecom.ConnectionService"/>
      </intent-filter>
    </service>
    
    <!-- Main activity -->
    <activity android:name=".MainActivity" ...>
      <!-- Deep linking, etc. -->
    </activity>
  </application>
</manifest>
```

---

### Phase 4: Native Build with Modified Manifest

Now Gradle builds the APK using your generated manifest:

```bash
./gradlew assembleRelease

# Gradle reads: android/app/src/main/AndroidManifest.xml
# Compiles: CallKeep native code from node_modules/react-native-callkeep/
# Links: VoiceConnectionService with Android's TelecomManager API
# Bundles: JavaScript from firebase-messaging.js, callkeepService.ts
# Creates: final APK with everything integrated
```

**Final APK Structure:**
```
docavailable.apk
├── AndroidManifest.xml (with CallKeep service ✅)
├── classes.dex (compiled Java including CallKeep)
├── lib/
│   └── arm64-v8a/
│       ├── libreactnativejni.so
│       └── ... (native libraries)
├── assets/
│   └── index.android.bundle (your JS)
└── META-INF/ (signatures)
```

---

## Config Plugin System

### What is a Config Plugin?

**Concept:** A JavaScript function that modifies native project configuration **during build time**.

```javascript
// Simplified
function myPlugin(expoConfig) {
  // Receives current configuration
  // Modifies it (add permissions, services, etc.)
  // Returns modified configuration
  return modifiedConfig;
}
```

### Execution Model

```
┌─────────────────────────────────────────────────────────────┐
│                     Build Time (EAS)                         │
│                                                              │
│  app.config.js                                               │
│  ├── plugins: [                                              │
│  │     'pluginA',  ────┐                                     │
│  │     'pluginB',  ────┼──> Load & Execute                   │
│  │     './plugins/withCallKeep'  ────┘                       │
│  │   ]                                                       │
│  │                                                           │
│  ↓                                                           │
│  Config Object (in memory)                                   │
│  ├── Initial state                                           │
│  ├── Modified by pluginA                                     │
│  ├── Modified by pluginB                                     │
│  └── Modified by withCallKeep                                │
│                                                              │
│  ↓                                                           │
│  Generate android/ and ios/ folders                          │
│  └── Write files based on final config state                 │
└─────────────────────────────────────────────────────────────┘
```

### Plugin Helpers

Expo provides helpers to modify specific files:

```javascript
const {
  withAndroidManifest,  // Modify AndroidManifest.xml
  withGradleProperties, // Modify gradle.properties
  withAppBuildGradle,   // Modify app/build.gradle
  withProjectBuildGradle, // Modify build.gradle
  withStringsXml,       // Modify res/values/strings.xml
} = require('@expo/config-plugins');

// Example: Your plugin
const withCallKeep = (config) => {
  // Modify manifest
  config = withAndroidManifest(config, (config) => {
    // Modify manifest object
    return config;
  });
  
  // Could also modify gradle if needed
  config = withGradleProperties(config, (config) => {
    // Add gradle properties
    return config;
  });
  
  return config;
};
```

---

## Why Plugin Won't Be Overwritten

### The Key Insight

**You're not editing generated files. You're editing the generator.**

Think of it like:
```
❌ BAD:  Editing compiled binary
✅ GOOD: Editing source code that gets compiled
```

### Traditional Bare Workflow Problem

```
Your Git Repo:
├── android/
│   └── app/
│       └── src/
│           └── main/
│               └── AndroidManifest.xml  ← YOU EDIT THIS MANUALLY
                    │
                    ├── Problem 1: Version control conflicts
                    ├── Problem 2: Expo SDK updates break it
                    ├── Problem 3: Team members overwrite changes
                    └── Problem 4: Hard to maintain consistency
```

**Every time Expo updates:**
```
You: git pull (get new Expo version)
Conflicts in android/app/src/main/AndroidManifest.xml
<<<<<<< HEAD
  <service android:name="io.wazo.callkeep.VoiceConnectionService">
=======
  (Expo's new changes)
>>>>>>> expo-update
```

### Managed Workflow Solution

```
Your Git Repo:
├── plugins/
│   └── withCallKeep.js        ← YOU EDIT THIS (source of truth)
│       └── Tracked in git ✅
│       └── Defines what manifest SHOULD contain
│       └── Runs every build
│
├── app.config.js
│   └── plugins: ['./plugins/withCallKeep']  ← Reference it
│
└── android/ ← NOT IN GIT (.gitignored)
    └── Generated fresh every build
    └── Deleted and recreated
    └── Never conflicts
```

**Build process:**
```
Step 1: rm -rf android/  (delete if exists)
Step 2: expo prebuild     (generate from scratch)
Step 3: Run plugins       (apply your modifications)
Step 4: Build APK         (use modified files)
```

### Guarantee of Persistence

**Your plugin is in source control:**
```
plugins/withCallKeep.js
├── Tracked: ✅ In git
├── Versioned: ✅ With your code
├── Reviewed: ✅ In pull requests
├── Tested: ✅ In CI/CD
└── Executed: ✅ Every single build
```

**Generated android/ is ephemeral:**
```
android/
├── Tracked: ❌ In .gitignore
├── Persisted: ❌ Deleted between builds
├── Modified: ❌ Changes don't matter
└── Regenerated: ✅ Fresh every build from plugins
```

### Verification: See Plugin Run

Add console logs to verify:

```javascript
// plugins/withCallKeep.js
const withCallKeep = (config) => {
  console.log('\n🔧 ========================================');
  console.log('   CallKeep Config Plugin Executing');
  console.log('========================================\n');
  
  return withAndroidManifest(config, async (config) => {
    console.log('📝 Modifying AndroidManifest.xml...');
    
    // Add permissions
    console.log('  • Adding CallKeep permissions...');
    // ... code ...
    console.log('    ✓ Added 9 permissions');
    
    // Add service
    console.log('  • Adding VoiceConnectionService...');
    // ... code ...
    console.log('    ✓ Service added to manifest');
    
    console.log('\n✅ CallKeep plugin complete!\n');
    return config;
  });
};
```

**During EAS build, you'll see:**
```
[PREBUILD] Running config plugins...
[PREBUILD] 
[PREBUILD] 🔧 ========================================
[PREBUILD]    CallKeep Config Plugin Executing
[PREBUILD] ========================================
[PREBUILD] 
[PREBUILD] 📝 Modifying AndroidManifest.xml...
[PREBUILD]   • Adding CallKeep permissions...
[PREBUILD]     ✓ Added 9 permissions
[PREBUILD]   • Adding VoiceConnectionService...
[PREBUILD]     ✓ Service added to manifest
[PREBUILD] 
[PREBUILD] ✅ CallKeep plugin complete!
```

### Plugin Execution Order Matters

```javascript
// app.config.js
plugins: [
  "expo-router",              // 1️⃣ Runs first
  "@react-native-firebase/app",     // 2️⃣ Then this
  "@react-native-firebase/messaging", // 3️⃣ Then this
  "./plugins/withCallKeep",         // 4️⃣ YOUR PLUGIN
  ["@react-native-google-signin/google-signin", {...}] // 5️⃣ Last
]
```

Each plugin receives the config as modified by previous plugins.

**Example flow:**
```
Initial: <manifest></manifest>

After expo-router:
<manifest>
  <activity android:name=".MainActivity">
    <intent-filter>
      <action android:name="android.intent.action.VIEW"/>
    </intent-filter>
  </activity>
</manifest>

After Firebase plugins:
<manifest>
  <activity>...</activity>
  <service android:name="FirebaseMessagingService">...</service>
</manifest>

After YOUR plugin:
<manifest>
  <activity>...</activity>
  <service android:name="FirebaseMessagingService">...</service>
  <service android:name="VoiceConnectionService">...</service>
</manifest>
```

---

**Continue to Part 2 for:** Complete call flow from backend to screen-off behavior

