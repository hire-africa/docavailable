@echo off
echo ========================================
echo Simple WebRTC Server Deployment
echo ========================================
echo.

echo [1/3] Copying updated WebRTC signaling server to production...
scp backend/webrtc-signaling-server.js root@46.101.123.123:/var/www/html/
if %errorlevel% neq 0 (
    echo ❌ Failed to copy webrtc-signaling-server.js
    pause
    exit /b 1
)

echo ✅ WebRTC server copied successfully
echo.

echo [2/3] Restarting WebRTC service on production server...
ssh root@46.101.123.123 "cd /var/www/html && pm2 restart webrtc-signaling || (pm2 start webrtc-signaling-server.js --name webrtc-signaling --port 8080 && pm2 save)"
if %errorlevel% neq 0 (
    echo ❌ Failed to restart WebRTC service
    pause
    exit /b 1
)

echo ✅ WebRTC service restarted successfully
echo.

echo [3/3] Testing production endpoints...
echo Testing WebRTC signaling server...
curl -s http://46.101.123.123:8080/health
echo.
echo Testing WebRTC chat signaling server...
curl -s http://46.101.123.123:8081/health
echo.

echo ✅ WebRTC server deployment completed!
echo.
echo 🔗 Your WebRTC servers are now running at:
echo    - ws://46.101.123.123:8080/audio-signaling
echo    - ws://46.101.123.123:8081/chat-signaling
echo.
pause
