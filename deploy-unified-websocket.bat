@echo off
echo ========================================
echo Deploying Unified WebSocket Server
echo ========================================

echo.
echo 1. Stopping existing WebSocket servers...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo 2. Backing up existing configurations...
if exist "backend\webrtc-signaling-server.js" (
    copy "backend\webrtc-signaling-server.js" "backend\webrtc-signaling-server.js.backup"
    echo   - Backed up webrtc-signaling-server.js
)

if exist "nginx-webrtc-proxy.conf" (
    copy "nginx-webrtc-proxy.conf" "nginx-webrtc-proxy.conf.backup"
    echo   - Backed up nginx-webrtc-proxy.conf
)

echo.
echo 3. Deploying unified WebSocket server...
copy "backend\webrtc-unified-server.js" "backend\webrtc-signaling-server.js"
echo   - Deployed unified server

echo.
echo 4. Deploying nginx configuration...
copy "nginx-webrtc-unified.conf" "nginx-webrtc-proxy.conf"
echo   - Deployed nginx config

echo.
echo 5. Installing dependencies...
cd backend
npm install ws axios
cd ..

echo.
echo 6. Starting unified WebSocket server...
cd backend
start "WebRTC Unified Server" node webrtc-unified-server.js
cd ..

echo.
echo 7. Testing server health...
timeout /t 3 /nobreak >nul
curl -s http://localhost:8080/health
if %errorlevel% equ 0 (
    echo   - Server is running and healthy
) else (
    echo   - Warning: Server health check failed
)

echo.
echo ========================================
echo Deployment Complete!
echo ========================================
echo.
echo WebSocket Endpoints:
echo   Audio: wss://docavailable.org/audio-signaling
echo   Chat:  wss://docavailable.org/chat-signaling
echo   Health: https://docavailable.org/webrtc-health
echo.
echo Next steps:
echo   1. Update nginx configuration on your server
echo   2. Restart nginx: sudo systemctl restart nginx
echo   3. Test connections with: node test-unified-websocket.js
echo.
pause
