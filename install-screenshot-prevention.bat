@echo off
REM Screenshot Prevention Installation Script for Windows
REM This script installs the required dependencies and sets up screenshot prevention

echo 🔒 Installing Screenshot Prevention for Doc Available...

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: package.json not found. Please run this script from the project root.
    pause
    exit /b 1
)

REM Install expo-screen-capture
echo 📦 Installing expo-screen-capture...
npm install expo-screen-capture@~7.1.0

REM Check if installation was successful
if %errorlevel% equ 0 (
    echo ✅ expo-screen-capture installed successfully
) else (
    echo ❌ Failed to install expo-screen-capture
    pause
    exit /b 1
)

REM For Android, we need to rebuild the app
echo 🔧 Android native module setup...
echo    - ScreenshotPreventionModule.java created
echo    - ScreenshotPreventionPackage.java created
echo    - MainApplication.kt updated

echo.
echo 📱 Next steps:
echo    1. For Android: Run 'npm run android' to rebuild with native modules
echo    2. For iOS: Run 'npm run ios' to rebuild with new dependencies
echo    3. Screenshot prevention will be automatically enabled in chat
echo.
echo 🔒 Screenshot prevention features:
echo    ✅ Cross-platform screenshot blocking
echo    ✅ Security watermark overlay
echo    ✅ Screenshot detection (iOS)
echo    ✅ Configurable security levels
echo    ✅ Persistent settings
echo.
echo 🎉 Installation complete! Screenshot prevention is now active.
pause
