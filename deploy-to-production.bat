@echo off
echo ========================================
echo Deploying to Production Server
echo ========================================
echo Target: 46.101.123.123 (DigitalOcean Droplet)
echo.

echo 1. Uploading unified WebSocket server...
scp backend/webrtc-unified-server.js root@46.101.123.123:/root/webrtc-signaling-server.js
if %errorlevel% neq 0 (
    echo   - Error: Could not upload server file
    echo   - Make sure you have SSH access to the server
    pause
    exit /b 1
)
echo   - Server file uploaded successfully

echo.
echo 2. Uploading nginx configuration...
scp nginx-webrtc-unified.conf root@46.101.123.123:/etc/nginx/sites-available/docavailable-webrtc.conf
if %errorlevel% neq 0 (
    echo   - Error: Could not upload nginx config
    pause
    exit /b 1
)
echo   - Nginx config uploaded successfully

echo.
echo 3. Installing dependencies on production server...
ssh root@46.101.123.123 "cd /root && npm install ws axios"
if %errorlevel% neq 0 (
    echo   - Error: Could not install dependencies
    pause
    exit /b 1
)
echo   - Dependencies installed successfully

echo.
echo 4. Stopping old WebSocket servers...
ssh root@46.101.123.123 "pkill -f webrtc-signaling-server || true"
echo   - Old servers stopped

echo.
echo 5. Starting unified WebSocket server...
ssh root@46.101.123.123 "cd /root && nohup node webrtc-signaling-server.js > webrtc-server.log 2>&1 &"
if %errorlevel% neq 0 (
    echo   - Error: Could not start server
    pause
    exit /b 1
)
echo   - Unified server started

echo.
echo 6. Updating nginx configuration...
ssh root@46.101.123.123 "cp /etc/nginx/sites-available/docavailable-webrtc.conf /etc/nginx/sites-enabled/ && nginx -t"
if %errorlevel% neq 0 (
    echo   - Error: Nginx configuration test failed
    pause
    exit /b 1
)
echo   - Nginx config updated

echo.
echo 7. Restarting nginx...
ssh root@46.101.123.123 "systemctl restart nginx"
if %errorlevel% neq 0 (
    echo   - Error: Could not restart nginx
    pause
    exit /b 1
)
echo   - Nginx restarted successfully

echo.
echo 8. Testing server health...
timeout /t 3 /nobreak >nul
curl -s https://docavailable.org/webrtc-health
if %errorlevel% equ 0 (
    echo   - Production server is healthy!
) else (
    echo   - Warning: Health check failed, but server may still be starting
)

echo.
echo ========================================
echo Production Deployment Complete!
echo ========================================
echo.
echo WebSocket Endpoints (Production):
echo   Audio: wss://docavailable.org/audio-signaling
echo   Chat:  wss://docavailable.org/chat-signaling
echo   Health: https://docavailable.org/webrtc-health
echo.
echo Next steps:
echo   1. Test with: node test-unified-websocket.js
echo   2. Check server logs: ssh root@46.101.123.123 "tail -f /root/webrtc-server.log"
echo   3. Monitor nginx logs: ssh root@46.101.123.123 "tail -f /var/log/nginx/error.log"
echo.
pause
