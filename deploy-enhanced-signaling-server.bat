@echo off
echo 🚀 Deploying Enhanced Unified Signaling Server to Droplet...
echo.

echo 📋 Step 1: Uploading enhanced server file...
scp webrtc-chat-signaling-server-updated.js root@46.101.123.123:/root/Doc_available/

echo.
echo 📋 Step 2: Stopping current signaling server...
ssh root@46.101.123.123 "pm2 stop webrtc-chat-signaling || echo 'Server not running'"

echo.
echo 📋 Step 3: Starting enhanced unified signaling server...
ssh root@46.101.123.123 "cd /root/Doc_available && pm2 start webrtc-chat-signaling-server-updated.js --name webrtc-unified-signaling"

echo.
echo 📋 Step 4: Checking server status...
ssh root@46.101.123.123 "pm2 status webrtc-unified-signaling"

echo.
echo 📋 Step 5: Testing server health...
curl -s http://46.101.123.123:8081/health

echo.
echo 📋 Step 6: Testing WebSocket connection...
echo Testing WebSocket connection to enhanced server...
node test-unified-signaling-server.js

echo.
echo ✅ Enhanced Unified Signaling Server deployment completed!
echo.
echo 📊 Server Details:
echo   - Chat endpoint: wss://docavailable.org/chat-signaling
echo   - Call endpoint: wss://docavailable.org/chat-signaling (same endpoint)
echo   - Health check: https://docavailable.org/webrtc-health
echo   - Handles both chat messages and WebRTC call signaling
echo.
echo 🔧 To monitor logs:
echo   ssh root@46.101.123.123 "pm2 logs webrtc-unified-signaling"
echo.
echo 🔧 To restart server:
echo   ssh root@46.101.123.123 "pm2 restart webrtc-unified-signaling"
