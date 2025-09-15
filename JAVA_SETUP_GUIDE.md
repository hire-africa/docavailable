# Java JDK Setup Guide for Android Development

## 🚨 Current Issue
You have Java Runtime Environment (JRE) installed, but Android development requires the **Java Development Kit (JDK)**.

## 🔧 Solution Options

### Option 1: Install OpenJDK (Recommended)

#### Using Chocolatey (if installed):
```powershell
# Install Chocolatey first if you don't have it
# Run PowerShell as Administrator and execute:
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Then install OpenJDK
choco install openjdk11
```

#### Manual Installation:
1. **Download OpenJDK 11** from: https://adoptium.net/
2. **Install** the downloaded `.msi` file
3. **Set JAVA_HOME** environment variable

### Option 2: Install Oracle JDK
1. **Download Oracle JDK 11** from: https://www.oracle.com/java/technologies/downloads/
2. **Install** the downloaded file
3. **Set JAVA_HOME** environment variable

## 🌍 Setting Environment Variables

### Method 1: Using PowerShell (Temporary)
```powershell
# Set JAVA_HOME (replace with your actual JDK path)
$env:JAVA_HOME = "C:\Program Files\Java\jdk-11.0.x"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"

# Verify installation
java -version
javac -version
```

### Method 2: System Environment Variables (Permanent)
1. **Open System Properties** (Win + R, type `sysdm.cpl`)
2. **Click "Environment Variables"**
3. **Under "System Variables"**:
   - **Add new variable**: `JAVA_HOME`
   - **Value**: `C:\Program Files\Java\jdk-11.0.x` (your JDK path)
4. **Edit PATH variable**:
   - **Add**: `%JAVA_HOME%\bin`
5. **Click OK** and restart PowerShell

## ✅ Verification

After installation, verify with:
```powershell
java -version    # Should show JDK version
javac -version   # Should show JDK compiler version
echo $env:JAVA_HOME  # Should show JDK path
```

## 🚀 After JDK Installation

Once JDK is properly installed, you can build your APK:

```powershell
# Build debug APK
npm run build:apk-debug

# Build release APK
npm run build:apk
```

## 🔍 Common JDK Paths

- **OpenJDK 11**: `C:\Program Files\Eclipse Adoptium\jdk-11.0.x-hotspot`
- **Oracle JDK 11**: `C:\Program Files\Java\jdk-11.0.x`
- **OpenJDK 17**: `C:\Program Files\Eclipse Adoptium\jdk-17.0.x-hotspot`

## 📞 Need Help?

If you encounter issues:
1. **Restart PowerShell** after setting environment variables
2. **Check PATH** includes JDK bin directory
3. **Verify JAVA_HOME** points to JDK (not JRE)
4. **Use Android Studio** to manage SDK and JDK automatically

---

**Note**: Android development requires JDK 11 or higher. Java 8 (which you currently have) is not sufficient for modern Android builds.
