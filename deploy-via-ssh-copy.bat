@echo off
echo 🚀 Deploying Enhanced Signaling Server via SSH...
echo.

echo 📋 Step 1: Creating the enhanced server file on the droplet...
ssh root@46.101.123.123 "cat > /root/webrtc-chat-signaling-server-updated.js << 'EOF'
$(Get-Content webrtc-chat-signaling-server-updated.js -Raw)
EOF"

echo.
echo 📋 Step 2: Moving file to correct location...
ssh root@46.101.123.123 "mkdir -p /root/Doc_available && mv /root/webrtc-chat-signaling-server-updated.js /root/Doc_available/"

echo.
echo 📋 Step 3: Stopping current signaling server...
ssh root@46.101.123.123 "pm2 stop webrtc-chat-signaling 2>/dev/null || echo 'Server not running'"

echo.
echo 📋 Step 4: Starting enhanced unified signaling server...
ssh root@46.101.123.123 "cd /root/Doc_available && pm2 start webrtc-chat-signaling-server-updated.js --name webrtc-unified-signaling"

echo.
echo 📋 Step 5: Checking server status...
ssh root@46.101.123.123 "pm2 status webrtc-unified-signaling"

echo.
echo ✅ Deployment completed!
