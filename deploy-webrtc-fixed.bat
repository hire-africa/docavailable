@echo off
echo ========================================
echo Deploying Updated WebRTC Server
echo ========================================

echo [1/3] Uploading updated server file...
scp webrtc-call-signaling-server-fixed.js root@46.101.123.123:/var/www/html/webrtc-call-signaling-server.js
if %errorlevel% neq 0 (
    echo ❌ Failed to upload server file
    pause
    exit /b 1
)
echo ✅ Server file uploaded successfully

echo.
echo [2/3] Restarting WebRTC server...
echo Please enter the server password when prompted
ssh root@46.101.123.123 "cd /var/www/html && pkill -f webrtc-call-signaling-server.js; sleep 2; nohup node webrtc-call-signaling-server.js > /var/log/webrtc-server.log 2>&1 &"
if %errorlevel% neq 0 (
    echo ❌ Failed to restart server
    pause
    exit /b 1
)
echo ✅ Server restarted successfully

echo.
echo [3/3] Testing endpoints...
timeout /t 3 /nobreak >nul
echo Testing call-signaling endpoint...
curl -s http://46.101.123.123:8080/health
echo.
echo Testing chat-signaling endpoint...
curl -s http://46.101.123.123:8080/chat-signaling
echo.

echo ========================================
echo Deployment Complete!
echo ========================================
echo.
echo WebRTC Endpoints:
echo   Call Signaling: wss://docavailable.org/call-signaling
echo   Chat Signaling: wss://docavailable.org/chat-signaling
echo   Health Check: http://46.101.123.123:8080/health
echo.
echo The server now supports both call and chat signaling!
echo.
pause
