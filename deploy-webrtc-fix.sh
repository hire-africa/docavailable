#!/bin/bash

# deploy-webrtc-fix.sh
# Script to deploy WebRTC server fix for port 80 compatibility

echo "🚀 Deploying WebRTC server fix..."

# Option 1: Update server to run on both ports
echo "📝 Option 1: Updating server to run on both ports 80 and 8080"
node update-webrtc-server.js

# Option 2: Set up nginx reverse proxy (recommended)
echo "📝 Option 2: Setting up nginx reverse proxy"

# Check if nginx is installed
if command -v nginx &> /dev/null; then
    echo "✅ Nginx is installed"
    
    # Copy nginx config
    sudo cp nginx-webrtc-proxy.conf /etc/nginx/sites-available/webrtc-proxy
    
    # Enable the site
    sudo ln -sf /etc/nginx/sites-available/webrtc-proxy /etc/nginx/sites-enabled/
    
    # Test nginx config
    if sudo nginx -t; then
        echo "✅ Nginx configuration is valid"
        sudo systemctl reload nginx
        echo "✅ Nginx reloaded successfully"
    else
        echo "❌ Nginx configuration error"
        exit 1
    fi
else
    echo "⚠️  Nginx not installed. Installing nginx..."
    sudo apt update
    sudo apt install -y nginx
    
    # Copy nginx config
    sudo cp nginx-webrtc-proxy.conf /etc/nginx/sites-available/webrtc-proxy
    
    # Enable the site
    sudo ln -sf /etc/nginx/sites-available/webrtc-proxy /etc/nginx/sites-enabled/
    
    # Test and start nginx
    if sudo nginx -t; then
        sudo systemctl enable nginx
        sudo systemctl start nginx
        echo "✅ Nginx installed and started"
    else
        echo "❌ Nginx configuration error"
        exit 1
    fi
fi

# Restart WebRTC server
echo "🔄 Restarting WebRTC signaling server..."
cd backend
pm2 restart webrtc-signaling-server || node webrtc-signaling-server.js &

echo "✅ WebRTC fix deployed successfully!"
echo ""
echo "🔗 Your WebRTC server now responds to:"
echo "   - ws://46.101.123.123:8080/audio-signaling (original)"
echo "   - ws://46.101.123.123:8080/chat-signaling (original)"
echo "   - ws://46.101.123.123/audio-signaling (via nginx proxy)"
echo "   - ws://46.101.123.123/chat-signaling (via nginx proxy)"
echo ""
echo "🧪 Test the fix:"
echo "   curl http://46.101.123.123/health"
echo "   curl http://46.101.123.123:8080/health"
