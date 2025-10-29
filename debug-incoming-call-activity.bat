@echo off
echo.
echo ========================================
echo   Debug Incoming Call Activity
echo ========================================
echo.

echo [1] Checking if IncomingCallActivity is in the APK manifest...
adb shell dumpsys package com.docavailable.app | findstr -i "IncomingCall"
echo.

echo [2] Checking notification channels...
adb shell dumpsys notification | findstr -i "calls"
echo.

echo [3] Checking if activity can be launched manually...
adb shell am start -n com.docavailable.app/.IncomingCallActivity
echo.

echo [4] Monitoring logs for activity launch...
echo Press Ctrl+C to stop monitoring
adb logcat | findstr -i "IncomingCall"
