@echo off
echo.
echo ========================================
echo   Verifying Native Module Registration
echo ========================================
echo.

echo Checking if IncomingCallModule is in the APK...
echo.

adb shell pm list packages | findstr docavailable
echo.

echo Dumping package info...
adb shell dumpsys package com.docavailable.app | findstr -i "IncomingCall"
echo.

echo If you see "IncomingCallActivity" or "IncomingCallService" above,
echo the native code was compiled.
echo.
echo If you see nothing, the build didn't include the native module.
echo.
pause
