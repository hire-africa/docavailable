@echo off
echo.
echo ========================================
echo   Incoming Call Debug - Live Monitoring
echo ========================================
echo.
echo This will show LIVE logs when a call arrives.
echo Keep this window open and send a test call now...
echo.
echo Press Ctrl+C to stop monitoring
echo.
echo ========================================
echo.

adb logcat -c
adb logcat -v time | findstr /i "IncomingCall notifee FCM Background WakeLock"
