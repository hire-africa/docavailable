#!/bin/bash

# Deploy WebRTC fixes to DigitalOcean droplet
# Usage: ./deploy-webrtc-fix.sh

echo "🚀 Deploying WebRTC fixes to DigitalOcean droplet..."

# Server details
SERVER_IP="46.101.123.123"
SERVER_USER="root"  # Adjust if you use a different user
PROJECT_DIR="/var/www/docavailable"

echo "📡 Connecting to server $SERVER_IP..."

# SSH into the server and run deployment commands
ssh $SERVER_USER@$SERVER_IP << 'EOF'
    echo "🔧 Updating project from GitHub..."
    cd /var/www/docavailable
    git pull origin main
    
    echo "📦 Installing/updating dependencies..."
    cd backend
    npm install
    
    echo "🔄 Stopping existing WebRTC server..."
    pkill -f "webrtc-signaling-server.js" || true
    
    echo "🚀 Starting WebRTC signaling server..."
    nohup node webrtc-signaling-server.js > /var/log/webrtc-server.log 2>&1 &
    
    echo "⏳ Waiting for server to start..."
    sleep 5
    
    echo "🧪 Testing server health..."
    curl -f http://localhost:8080/health || echo "❌ Health check failed"
    
    echo "✅ WebRTC server deployment completed!"
    echo "📊 Server status:"
    ps aux | grep webrtc-signaling-server.js | grep -v grep
EOF

echo "🎉 Deployment completed!"
echo "🌐 WebRTC server should now be running on wss://46.101.123.123:8080"
echo "📋 Check server logs: ssh root@46.101.123.123 'tail -f /var/log/webrtc-server.log'"