@echo off
echo ========================================
echo Deploying WebRTC Server to DigitalOcean Droplet
echo ========================================
echo.

echo [1/4] Copying updated WebRTC signaling server to droplet...
scp backend/webrtc-signaling-server.js root@46.101.123.123:/var/www/html/
if %errorlevel% neq 0 (
    echo ❌ Failed to copy webrtc-signaling-server.js to droplet
    pause
    exit /b 1
)

echo ✅ WebRTC server copied to droplet successfully
echo.

echo [2/4] Installing dependencies on droplet...
ssh root@46.101.123.123 "cd /var/www/html && npm install ws axios"
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies on droplet
    pause
    exit /b 1
)

echo ✅ Dependencies installed on droplet
echo.

echo [3/4] Starting/restarting WebRTC service on droplet...
ssh root@46.101.123.123 "cd /var/www/html && pm2 stop webrtc-signaling 2>nul; WEBRTC_SIGNALING_PORT=8082 pm2 start webrtc-signaling-server.js --name webrtc-signaling; pm2 save"
if %errorlevel% neq 0 (
    echo ❌ Failed to start WebRTC service on droplet
    pause
    exit /b 1
)

echo ✅ WebRTC service started on droplet
echo.

echo [4/4] Testing droplet endpoints...
echo Testing WebRTC signaling server on droplet...
curl -s http://46.101.123.123:8082/health
echo.
echo Testing WebRTC chat signaling server on droplet...
curl -s http://46.101.123.123:8082/health
echo.

echo ✅ WebRTC server deployment to droplet completed!
echo.
echo 🔗 Your WebRTC servers are now running on the droplet at:
echo    - ws://46.101.123.123:8080/audio-signaling
echo    - ws://46.101.123.123:8081/chat-signaling
echo.
echo 📱 App will connect to these endpoints for real-time calls
echo.
pause
