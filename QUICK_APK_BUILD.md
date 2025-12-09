# Quick APK Build Guide for DocAvailable

## 🚀 Immediate APK Building

### Option 1: Using the Interactive Script (Easiest)

**For Windows:**
```bash
build-apk.bat
```

**For Unix/Linux/macOS:**
```bash
./build-apk.sh
```

### Option 2: Direct Commands

**Build Debug APK (for testing):**
```bash
npm run build:apk-debug
```

**Build Release APK (for production):**
```bash
npm run build:apk
```

## 📱 APK File Locations

After successful build, your APK files will be located at:

- **Debug APK**: `android/app/build/outputs/apk/debug/app-debug.apk`
- **Release APK**: `android/app/build/outputs/apk/release/app-release.apk`

## 🔄 Handling Updates

### For JavaScript/React Native Changes (Recommended)
Your app is configured for **Over-the-Air (OTA) updates**! This means:

1. **Make your code changes**
2. **Publish the update** (no need to rebuild APK):
   ```bash
   expo publish
   ```
3. **Users get updates automatically** when they open the app

### For Native Code Changes
When you modify native Android code or add new dependencies:

1. **Increment version**:
   ```bash
   # Windows
   scripts\increment-version.bat patch
   
   # Unix/Linux/macOS
   ./scripts/increment-version.sh patch
   ```

2. **Build new APK**:
   ```bash
   npm run build:apk
   ```

3. **Distribute the new APK** to users

## 🛠️ Prerequisites Check

Before building, ensure you have:

- ✅ Node.js (v16 or higher)
- ✅ Java JDK (v11 or higher)
- ✅ Android Studio with Android SDK
- ✅ ANDROID_HOME environment variable set

## 🔧 Troubleshooting

**If build fails:**

1. **Clean the project**:
   ```bash
   npm run clean:android
   ```

2. **Check Android SDK**:
   ```bash
   # Verify Android SDK installation
   adb --version
   ```

3. **Check Java version**:
   ```bash
   java -version
   ```

## 📋 Version Management

**Current version**: 1.0.0 (code: 1)

**To update version**:
- **Patch update** (bug fixes): `./scripts/increment-version.sh patch`
- **Minor update** (new features): `./scripts/increment-version.sh minor`
- **Major update** (breaking changes): `./scripts/increment-version.sh major`

## 🎯 Next Steps

1. **Test the APK** on a real Android device
2. **Distribute** via:
   - Google Drive/Dropbox (for testing)
   - Google Play Store (for production)
   - Direct APK sharing

## 📞 Support

If you encounter issues:
1. Check the detailed guide: `APK_BUILD_GUIDE.md`
2. Verify all prerequisites are installed
3. Check Android Studio logs for specific errors

---

**Happy Building! 🎉**
