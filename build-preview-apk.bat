@echo off
echo ========================================
echo DocAvailable Preview APK Builder
echo ========================================
echo.
echo This builds a production-like APK with:
echo - Production environment variables
echo - Release build configuration
echo - Debug signing (for testing)
echo.

echo Setting up production environment...
set NODE_ENV=production

echo.
echo Building Preview APK...
echo.

cd android
call gradlew.bat assembleRelease

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo Preview APK built successfully!
    echo ========================================
    echo.
    echo APK Location: android\app\build\outputs\apk\release\app-release.apk
    echo.
    echo This APK contains:
    echo - Production API endpoints
    echo - All production features enabled
    echo - Debug signing (for testing only)
    echo.
    echo You can install this on any Android device for testing.
) else (
    echo.
    echo ========================================
    echo Build failed! Please check the error messages above.
    echo ========================================
)

cd ..
pause
