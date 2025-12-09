@echo off
echo ========================================
echo DocAvailable Cloud APK Builder
echo ========================================
echo.
echo This will build your APK in the cloud (no local dependencies needed!)
echo.

echo Choose build type:
echo 1. Preview APK (for testing)
echo 2. Production APK (for distribution)
echo 3. Development APK (for development)
echo 4. Exit
echo.

set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" goto preview
if "%choice%"=="2" goto production
if "%choice%"=="3" goto development
if "%choice%"=="4" goto exit

echo Invalid choice. Please try again.
goto :eof

:preview
echo.
echo Building Preview APK in the cloud...
echo.
eas build --platform android --profile preview
if %errorlevel% equ 0 (
    echo.
    echo Preview APK built successfully!
    echo Check your email or Expo dashboard for download link.
) else (
    echo.
    echo Build failed! Please check the error messages above.
)
goto :eof

:production
echo.
echo Building Production APK in the cloud...
echo.
eas build --platform android --profile production
if %errorlevel% equ 0 (
    echo.
    echo Production APK built successfully!
    echo Check your email or Expo dashboard for download link.
) else (
    echo.
    echo Build failed! Please check the error messages above.
)
goto :eof

:development
echo.
echo Building Development APK in the cloud...
echo.
eas build --platform android --profile development
if %errorlevel% equ 0 (
    echo.
    echo Development APK built successfully!
    echo Check your email or Expo dashboard for download link.
) else (
    echo.
    echo Build failed! Please check the error messages above.
)
goto :eof

:exit
echo.
echo Exiting...
exit /b 0
