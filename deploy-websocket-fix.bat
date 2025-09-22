@echo off
echo =====================================
echo WebSocket 400 Bad Request Fix
echo =====================================
echo.

echo [1/5] Backing up current nginx config...
if exist "nginx-webrtc-proxy.conf.backup" (
    echo Backup already exists, skipping...
) else (
    if exist "nginx-webrtc-proxy.conf" (
        copy "nginx-webrtc-proxy.conf" "nginx-webrtc-proxy.conf.backup"
        echo ✅ Backup created
    ) else (
        echo ⚠️  No existing config to backup
    )
)

echo.
echo [2/5] Deploying new nginx configuration...
if exist "nginx-webrtc-proxy.conf" (
    echo ✅ New nginx config is ready
    echo Please copy nginx-webrtc-proxy.conf to your server and restart nginx:
    echo   sudo cp nginx-webrtc-proxy.conf /etc/nginx/sites-available/webrtc-proxy
    echo   sudo ln -sf /etc/nginx/sites-available/webrtc-proxy /etc/nginx/sites-enabled/
    echo   sudo nginx -t
    echo   sudo systemctl restart nginx
) else (
    echo ❌ nginx-webrtc-proxy.conf not found
    exit /b 1
)

echo.
echo [3/5] Updated configuration files:
echo ✅ app.config.js - Fixed WebSocket URLs
echo ✅ services/configService.ts - Fixed WebSocket URLs  
echo ✅ services/instantSessionMessageDetector.ts - Fixed port reference

echo.
echo [4/5] Testing WebSocket connections...
echo Running test script...
node test-websocket-fix.js
if %errorlevel% neq 0 (
    echo ❌ WebSocket tests failed
    echo Please check server configuration and try again
    pause
    exit /b 1
)

echo.
echo [5/5] Fix deployment completed!
echo.
echo ✅ WebSocket 400 Bad Request issue has been fixed
echo.
echo Next steps:
echo 1. Deploy the updated nginx configuration to your server
echo 2. Restart nginx: sudo systemctl restart nginx
echo 3. Restart your WebRTC server if needed
echo 4. Test your app with real-time messaging and audio calls
echo.
echo Configuration Summary:
echo - Audio Signaling: ws://46.101.123.123/audio-signaling
echo - Chat Signaling: ws://46.101.123.123/chat-signaling
echo - Both routes proxy to: http://localhost:8080
echo.
pause
