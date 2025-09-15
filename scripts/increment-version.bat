@echo off
setlocal enabledelayedexpansion

REM DocAvailable Version Increment Script for Windows
REM This script automatically increments the version code and optionally version name
REM Usage: scripts\increment-version.bat [patch|minor|major]

echo ========================================
echo DocAvailable Version Increment Tool
echo ========================================

REM Check if we're in the right directory
if not exist "android\app\build.gradle" (
    echo [ERROR] This script must be run from the project root directory
    exit /b 1
)

set BUILD_GRADLE=android\app\build.gradle

REM Read current version from build.gradle
for /f "tokens=2 delims= " %%i in ('findstr "versionName" "%BUILD_GRADLE%"') do set CURRENT_VERSION=%%i
set CURRENT_VERSION=!CURRENT_VERSION:"=!

for /f "tokens=2 delims= " %%i in ('findstr "versionCode" "%BUILD_GRADLE%"') do set CURRENT_CODE=%%i

echo [INFO] Current version: !CURRENT_VERSION! (code: !CURRENT_CODE!)

REM Determine version increment type
set INCREMENT_TYPE=%1
if "%INCREMENT_TYPE%"=="" set INCREMENT_TYPE=patch

if "%INCREMENT_TYPE%"=="patch" (
    echo [INFO] Incrementing version type: patch
) else if "%INCREMENT_TYPE%"=="minor" (
    echo [INFO] Incrementing version type: minor
) else if "%INCREMENT_TYPE%"=="major" (
    echo [INFO] Incrementing version type: major
) else (
    echo [ERROR] Invalid increment type. Use: patch, minor, or major
    exit /b 1
)

REM Increment version code
set /a NEW_CODE=!CURRENT_CODE! + 1
echo [INFO] New version code: !NEW_CODE!

REM Parse current version components
for /f "tokens=1,2,3 delims=." %%a in ("!CURRENT_VERSION!") do (
    set MAJOR=%%a
    set MINOR=%%b
    set PATCH=%%c
)

REM Calculate new version based on increment type
if "%INCREMENT_TYPE%"=="patch" (
    set /a NEW_PATCH=!PATCH! + 1
    set NEW_VERSION=!MAJOR!.!MINOR!.!NEW_PATCH!
) else if "%INCREMENT_TYPE%"=="minor" (
    set /a NEW_MINOR=!MINOR! + 1
    set NEW_PATCH=0
    set NEW_VERSION=!MAJOR!.!NEW_MINOR!.!NEW_PATCH!
) else if "%INCREMENT_TYPE%"=="major" (
    set /a NEW_MAJOR=!MAJOR! + 1
    set NEW_MINOR=0
    set NEW_PATCH=0
    set NEW_VERSION=!NEW_MAJOR!.!NEW_MINOR!.!NEW_PATCH!
)

echo [INFO] New version name: !NEW_VERSION!

REM Backup original file
copy "%BUILD_GRADLE%" "%BUILD_GRADLE%.backup" >nul
echo [INFO] Backup created: %BUILD_GRADLE%.backup

REM Update version code
powershell -Command "(Get-Content '%BUILD_GRADLE%') -replace 'versionCode !CURRENT_CODE!', 'versionCode !NEW_CODE!' | Set-Content '%BUILD_GRADLE%'"

REM Update version name
powershell -Command "(Get-Content '%BUILD_GRADLE%') -replace 'versionName \"!CURRENT_VERSION!\"', 'versionName \"!NEW_VERSION!\"' | Set-Content '%BUILD_GRADLE%'"

REM Verify changes
for /f "tokens=2 delims= " %%i in ('findstr "versionName" "%BUILD_GRADLE%"') do set UPDATED_VERSION=%%i
set UPDATED_VERSION=!UPDATED_VERSION:"=!

for /f "tokens=2 delims= " %%i in ('findstr "versionCode" "%BUILD_GRADLE%"') do set UPDATED_CODE=%%i

if "!UPDATED_VERSION!"=="!NEW_VERSION!" if "!UPDATED_CODE!"=="!NEW_CODE!" (
    echo [INFO] Version updated successfully!
    echo [INFO] Updated version: !UPDATED_VERSION! (code: !UPDATED_CODE!)
    
    REM Also update app.config.js if it exists
    if exist "app.config.js" (
        echo [INFO] Updating app.config.js version...
        powershell -Command "(Get-Content 'app.config.js') -replace 'version: \"!CURRENT_VERSION!\"', 'version: \"!NEW_VERSION!\"' | Set-Content 'app.config.js'"
        echo [INFO] app.config.js updated
    )
    
    REM Also update package.json if it exists
    if exist "package.json" (
        echo [INFO] Updating package.json version...
        powershell -Command "(Get-Content 'package.json') -replace '\"version\": \"!CURRENT_VERSION!\"', '\"version\": \"!NEW_VERSION!\"' | Set-Content 'package.json'"
        echo [INFO] package.json updated
    )
    
    echo.
    echo [INFO] Ready to build APK with new version!
    echo [INFO] Run: npm run build:apk
    
) else (
    echo [ERROR] Version update failed!
    echo [INFO] Restoring backup...
    move "%BUILD_GRADLE%.backup" "%BUILD_GRADLE%" >nul
    exit /b 1
)

echo.
echo [INFO] Version increment completed successfully!
