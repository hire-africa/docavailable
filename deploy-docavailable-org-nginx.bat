@echo off
echo ========================================
echo Deploy Nginx Configuration for docavailable.org
echo ========================================
echo.

echo [1/4] Copying nginx configuration to production server...
scp webrtc-signaling.conf root@46.101.123.123:/etc/nginx/sites-available/docavailable.org
if %errorlevel% neq 0 (
    echo ❌ Failed to copy nginx configuration
    pause
    exit /b 1
)

echo ✅ Nginx configuration copied successfully
echo.

echo [2/4] Enabling the site and testing configuration...
ssh root@46.101.123.123 "ln -sf /etc/nginx/sites-available/docavailable.org /etc/nginx/sites-enabled/ && nginx -t"

if %errorlevel% neq 0 (
    echo ❌ Failed to enable site or nginx test failed
    pause
    exit /b 1
)

echo ✅ Site enabled and nginx configuration tested
echo.

echo [3/4] Reloading nginx...
ssh root@46.101.123.123 "systemctl reload nginx"
if %errorlevel% neq 0 (
    echo ❌ Failed to reload nginx
    pause
    exit /b 1
)

echo ✅ Nginx reloaded successfully
echo.

echo [4/4] Testing WebRTC endpoints...
echo Testing docavailable.org health endpoint...
curl -s https://docavailable.org/webrtc-health
echo.
echo Testing docavailable.org root endpoint...
curl -s https://docavailable.org/
echo.

echo ========================================
echo Deployment completed!
echo ========================================
echo.
echo ✅ Nginx configuration deployed for docavailable.org
echo ✅ WebRTC signaling endpoints should now be available:
echo    - wss://docavailable.org/audio-signaling
echo    - wss://docavailable.org/chat-signaling
echo    - https://docavailable.org/webrtc-health
echo.
echo Next steps:
echo 1. Test the WebRTC signaling endpoints
echo 2. Build and test production app with new configuration
echo.
pause
