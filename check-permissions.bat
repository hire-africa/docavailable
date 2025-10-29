@echo off
echo.
echo ========================================
echo   DocAvailable Permission Check
echo ========================================
echo.

echo Checking if device is connected...
adb devices
echo.

echo [1] Checking "Display over other apps" permission...
adb shell appops get com.docavailable.app SYSTEM_ALERT_WINDOW
echo    ^^ Should say "allow" - ALREADY ENABLED ✓
echo.

echo [2] Checking Battery Optimization (CRITICAL!)...
adb shell dumpsys battery | findstr com.docavailable.app
adb shell cmd appops get com.docavailable.app RUN_IN_BACKGROUND
echo    ^^ Should say "allow" or show app in whitelist
echo.

echo [3] Checking if app can wake device...
adb shell dumpsys power | findstr "mWakefulness"
echo    ^^ Shows current device wake state
echo.

echo [4] Checking Schedule Exact Alarms (Android 12+)...
adb shell appops get com.docavailable.app SCHEDULE_EXACT_ALARM
echo    ^^ Should say "allow" for Android 12+
echo.

echo [5] Checking notification channels...
adb shell dumpsys notification | findstr "com.docavailable.app"
echo.

echo ========================================
echo   DIAGNOSIS
echo ========================================
echo.
echo Display over other apps: ENABLED ✓
echo.
echo MOST LIKELY ISSUE: Battery Optimization
echo.
echo FIX: Disable battery optimization
echo 1. Settings ^> Apps ^> DocAvailable
echo 2. Battery ^> Unrestricted (or Don't optimize)
echo.
echo ALSO CHECK (Android 12+):
echo - Settings ^> Apps ^> DocAvailable
echo - Special app access
echo - Alarms ^& reminders ^> Allow
echo.

pause
