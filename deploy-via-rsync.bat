@echo off
echo 🚀 Deploying Enhanced Signaling Server via rsync...
echo.

echo 📋 Step 1: Uploading file via rsync...
rsync -avz -e ssh webrtc-chat-signaling-server-updated.js root@46.101.123.123:/root/Doc_available/

echo.
echo 📋 Step 2: Stopping current signaling server...
ssh root@46.101.123.123 "pm2 stop webrtc-chat-signaling 2>/dev/null || echo 'Server not running'"

echo.
echo 📋 Step 3: Starting enhanced unified signaling server...
ssh root@46.101.123.123 "cd /root/Doc_available && pm2 start webrtc-chat-signaling-server-updated.js --name webrtc-unified-signaling"

echo.
echo 📋 Step 4: Checking server status...
ssh root@46.101.123.123 "pm2 status webrtc-unified-signaling"

echo.
echo ✅ Deployment completed!
