@echo off
echo.
echo ========================================
echo   Verify IncomingCallActivity in APK
echo ========================================
echo.

echo This script helps verify that IncomingCallActivity was included in the EAS build.
echo.

echo Method 1: Check via ADB (if APK is installed)
echo ----------------------------------------
adb shell dumpsys package com.docavailable.app | findstr -i "IncomingCall"
echo.

echo Method 2: Manual APK inspection
echo ----------------------------------------
echo 1. Download your APK from EAS build
echo 2. Rename .apk to .zip
echo 3. Extract the ZIP file
echo 4. Open AndroidManifest.xml
echo 5. Search for: android:name=".IncomingCallActivity"
echo.

echo Method 3: Test direct launch
echo ----------------------------------------
echo Try launching the activity directly:
adb shell am start -n com.docavailable.app/.IncomingCallActivity
echo.

echo If you see "Activity class does not exist" - the activity wasn't included.
echo If the activity launches - SUCCESS! ✅
echo.

echo Expected in AndroidManifest.xml:
echo ^<activity android:name=".IncomingCallActivity"
echo          android:showWhenLocked="true"
echo          android:turnScreenOn="true" /^>
echo.
pause
