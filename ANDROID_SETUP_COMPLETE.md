# Complete Android Development Setup Guide

## 🎯 **Current Status**
- ✅ Node.js and npm working
- ✅ Expo CLI working
- ❌ Java JDK missing (need JDK 11+)
- ❌ Android device/emulator needed

## 🚀 **Step-by-Step Setup**

### **Step 1: Install Java JDK**

#### **Option A: Download and Install Manually**
1. **Go to**: https://adoptium.net/temurin/releases/
2. **Download**: Windows x64 MSI Installer (JDK 11 or 17)
3. **Install** the downloaded file
4. **Set JAVA_HOME**:
   ```powershell
   # Open System Properties (Win + R, type: sysdm.cpl)
   # Environment Variables → System Variables → New
   # Variable name: JAVA_HOME
   # Variable value: C:\Program Files\Eclipse Adoptium\jdk-11.0.x-hotspot
   ```

#### **Option B: Use Android Studio (Recommended)**
1. **Download Android Studio**: https://developer.android.com/studio
2. **Install** with default settings
3. **Android Studio will install JDK automatically**

### **Step 2: Set Up Android Device/Emulator**

#### **Option A: Physical Android Device**
1. **Enable Developer Options**:
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times
2. **Enable USB Debugging**:
   - Settings → Developer Options → USB Debugging
3. **Connect device** via USB
4. **Allow USB Debugging** on device

#### **Option B: Android Emulator**
1. **Open Android Studio**
2. **Tools → AVD Manager**
3. **Create Virtual Device**
4. **Start the emulator**

### **Step 3: Verify Setup**

After installing JDK and setting up device/emulator:

```powershell
# Check Java
java -version
javac -version

# Check Android
adb devices

# Build APK
npm run build:apk-debug
```

## 🔧 **Alternative: Use Expo Development Build**

If you want to test without full Android setup:

```powershell
# Install Expo Go on your phone from Play Store
# Then run:
npx expo start

# Scan QR code with Expo Go app
```

## 📱 **APK Building Options**

### **Option 1: Local Build (After JDK Setup)**
```powershell
# Debug APK
npm run build:apk-debug

# Release APK
npm run build:apk
```

### **Option 2: Expo Cloud Build**
```powershell
# Install EAS CLI
npm install -g @expo/eas-cli

# Login to Expo
eas login

# Build APK
eas build --platform android --profile preview
```

### **Option 3: Android Studio**
1. **Open project in Android Studio**
2. **Build → Build Bundle(s) / APK(s)**
3. **Choose APK or Bundle**

## 🎯 **Recommended Path**

1. **Install Android Studio** (includes JDK)
2. **Set up Android emulator**
3. **Build APK locally**

## 📞 **Quick Commands After Setup**

```powershell
# Check if everything is working
java -version
adb devices
npm run build:apk-debug

# If successful, APK will be at:
# android/app/build/outputs/apk/debug/app-debug.apk
```

## 🔄 **Update Strategy**

### **For JavaScript Changes (Most Common)**
```powershell
# Publish OTA update (no APK rebuild needed)
npx expo publish
```

### **For Native Changes**
```powershell
# Increment version
.\scripts\increment-version.bat patch

# Build new APK
npm run build:apk
```

---

**Next Steps**: Install JDK and set up Android device/emulator, then you'll be able to build APK files!
