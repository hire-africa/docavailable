#!/bin/bash

# Deploy image fix to production server
echo "🚀 Deploying image fix to production server..."

# Copy the updated WebRTC server with image support
scp webrtc-chat-server-with-images.js root@46.101.123.123:/var/www/docavailable/

# Copy the image server
scp image-server.js root@46.101.123.123:/var/www/docavailable/

# SSH into server and restart services
ssh root@46.101.123.123 << 'EOF'
cd /var/www/docavailable

# Install dependencies if needed
npm install formidable

# Create necessary directories
mkdir -p storage/app/public/chat_images
mkdir -p storage/app/public/chat_voice_messages
mkdir -p storage/app/public/temp

# Set proper permissions
chmod -R 755 storage/app/public

# Kill existing processes
pkill -f "webrtc-chat-server-with-images.js" || true
pkill -f "image-server.js" || true

# Start the WebRTC chat server with image support
nohup node webrtc-chat-server-with-images.js > webrtc-chat.log 2>&1 &

# Start the image server
nohup node image-server.js > image-server.log 2>&1 &

# Check if services are running
sleep 3
ps aux | grep -E "(webrtc-chat-server|image-server)" | grep -v grep

echo "✅ Services deployed and started"
echo "📊 WebRTC Chat Server: https://docavailable.org:8081/health"
echo "🖼️ Image Server: https://docavailable.org:8083/health"
EOF

echo "🎉 Image fix deployment completed!"
