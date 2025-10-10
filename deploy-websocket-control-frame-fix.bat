@echo off
echo ========================================
echo WebSocket Control Frame Fix Deployment
echo ========================================
echo.

echo [1/4] Copying updated WebSocket server to production...
scp backend/webrtc-signaling-server.js root@46.101.123.123:/var/www/html/
if %errorlevel% neq 0 (
    echo ❌ Failed to copy webrtc-signaling-server.js
    echo Please check your SSH connection and server credentials
    pause
    exit /b 1
)

echo ✅ WebSocket server copied successfully
echo.

echo [2/4] Connecting to server to restart WebSocket service...
echo Please enter the server password when prompted
echo.

ssh root@46.101.123.123 << 'EOF'
echo "Restarting WebRTC signaling server with fixes..."
cd /var/www/html

# Stop the existing service
pm2 stop webrtc-signaling 2>/dev/null || echo "Service not running"

# Start the updated service
pm2 start webrtc-signaling-server.js --name "webrtc-signaling" --port 8080

# Save PM2 configuration
pm2 save

echo "Checking service status..."
pm2 status webrtc-signaling

echo "Testing WebSocket server health..."
curl -s http://localhost:8080/health
echo ""

echo "WebSocket server restarted with control frame fixes!"
EOF

if %errorlevel% neq 0 (
    echo ❌ Failed to restart service on server
    echo Please check server connection and try again
    pause
    exit /b 1
)

echo.
echo [3/4] Testing production WebSocket endpoint...
echo Testing WebSocket connection...
curl -s https://docavailable-3vbdv.ondigitalocean.app/audio-signaling/health
echo.

echo [4/4] Deployment completed!
echo.
echo ✅ WebSocket server updated with control frame fixes
echo ✅ Service restarted successfully
echo.
echo The fixes include:
echo - Disabled perMessageDeflate to prevent frame issues
echo - Set proper maxPayload limits
echo - Fixed ping/pong frame handling
echo - Added heartbeat mechanism
echo.
echo Next steps:
echo 1. Test your app - the "Control frames must be final" error should be fixed
echo 2. Try making a call to verify WebSocket connection works
echo.
pause
