@echo off
echo ========================================
echo DocAvailable APK Builder
echo ========================================

echo.
echo Choose build type:
echo 1. Debug APK (for testing)
echo 2. Release APK (for production)
echo 3. Clean and build
echo 4. Exit
echo.

set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" goto debug
if "%choice%"=="2" goto release
if "%choice%"=="3" goto clean
if "%choice%"=="4" goto exit

echo Invalid choice. Please try again.
goto :eof

:debug
echo.
echo Building Debug APK...
echo.
npm run build:apk-debug
if %errorlevel% equ 0 (
    echo.
    echo Debug APK built successfully!
    echo Location: android/app/build/outputs/apk/debug/app-debug.apk
) else (
    echo.
    echo Build failed! Please check the error messages above.
)
goto :eof

:release
echo.
echo Building Release APK...
echo.
npm run build:apk
if %errorlevel% equ 0 (
    echo.
    echo Release APK built successfully!
    echo Location: android/app/build/outputs/apk/release/app-release.apk
) else (
    echo.
    echo Build failed! Please check the error messages above.
)
goto :eof

:clean
echo.
echo Cleaning Android build...
echo.
npm run clean:android
echo.
echo Clean completed. You can now run a fresh build.
goto :eof

:exit
echo.
echo Exiting...
exit /b 0
