@echo off
echo.
echo ========================================
echo   Clean EAS Build for IncomingCallActivity
echo ========================================
echo.

echo [1/3] Clearing EAS build cache...
eas build --clear-cache --platform android --profile development

echo.
echo [2/3] Build completed! 
echo.

echo [3/3] Next steps:
echo 1. Download the APK when build completes
echo 2. Test incoming call functionality
echo 3. Check logs for IncomingCallActivity launch
echo.

echo Expected behavior:
echo - Screen wakes up
echo - IncomingCallActivity launches directly
echo - Call UI shows over lock screen
echo - No app boot delay
echo.
pause
