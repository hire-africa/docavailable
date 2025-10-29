@echo off
echo.
echo ============================================
echo   COMPLETE CLEAN REBUILD - Nuclear Option
echo ============================================
echo.
echo This will:
echo 1. Kill Metro
echo 2. Clear all Gradle caches
echo 3. Clear build directories
echo 4. Clear Metro cache
echo 5. Rebuild from scratch
echo.
echo This will take 5-10 minutes but WILL include native code.
echo.
pause

echo.
echo [1/7] Killing Metro and processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 >nul

echo.
echo [2/7] Clearing Gradle caches...
cd android
call gradlew clean
call gradlew cleanBuildCache
rmdir /S /Q .gradle 2>nul
rmdir /S /Q build 2>nul
rmdir /S /Q app\build 2>nul
cd ..

echo.
echo [3/7] Clearing Metro cache...
rmdir /S /Q node_modules\.cache 2>nul
del /F /Q .expo\* 2>nul

echo.
echo [4/7] Clearing Metro bundler cache...
npx react-native start --reset-cache &
timeout /t 5 >nul
taskkill /F /IM node.exe 2>nul

echo.
echo [5/7] Uninstalling old APK from device...
adb uninstall com.docavailable.app

echo.
echo [6/7] Building fresh APK (this takes time)...
cd android
call gradlew assembleDebug
cd ..

echo.
echo [7/7] Installing fresh APK...
cd android\app\build\outputs\apk\debug
for %%f in (*.apk) do (
    echo Installing %%f...
    adb install "%%f"
)
cd ..\..\..\..\..\..

echo.
echo ============================================
echo   BUILD COMPLETE!
echo ============================================
echo.
echo The APK now includes the native module.
echo.
echo Run the app and test incoming calls.
echo The module should now be available.
echo.
pause
