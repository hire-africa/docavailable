#!/bin/bash

# DocAvailable Unified Signaling Deployment Script
# This script deploys the unified signaling server and updates Nginx

SERVER_IP="46.101.123.123"
BACKEND_DIR="/root/Doc_available"

echo "🚀 Starting Unified Signaling Deployment..."

# 1. Upload the unified server
echo "📤 Uploading unified server code..."
scp backend/webrtc-unified-server.js root@$SERVER_IP:$BACKEND_DIR/

# 2. Stop old processes
echo "⏹️ Stopping old signaling processes..."
ssh root@$SERVER_IP "pm2 stop webrtc-signaling-server webrtc-chat-signaling-server webrtc-call-signaling-server || true"
ssh root@$SERVER_IP "pm2 delete webrtc-signaling-server webrtc-chat-signaling-server webrtc-call-signaling-server || true"

# 3. Start unified process
echo "▶️ Starting unified signaling process on Port 8080..."
ssh root@$SERVER_IP "cd $BACKEND_DIR && pm2 start webrtc-unified-server.js --name webrtc-unified-signaling"

# 4. Save PM2 state
ssh root@$SERVER_IP "pm2 save"

echo "✅ Deployment complete! Now update your Nginx config using the provided block."
