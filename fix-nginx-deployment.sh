#!/bin/bash

echo "🔧 WebSocket 400 Bad Request - Nginx Deployment Fix"
echo "=================================================="

# Check if we can connect to the server
echo "🔍 Checking server connectivity..."
if curl -s --connect-timeout 5 http://46.101.123.123/health > /dev/null; then
    echo "✅ Server is reachable"
else
    echo "❌ Server is not reachable"
    exit 1
fi

echo ""
echo "📋 Current nginx configuration status:"
echo "====================================="

# Test current endpoints
echo "Testing /audio-signaling (should work):"
curl -s -I http://46.101.123.123/audio-signaling/test123 | head -1

echo "Testing /chat-signaling (currently failing):"
curl -s -I http://46.101.123.123/chat-signaling/test123 | head -1

echo "Testing /health (should work):"
curl -s -I http://46.101.123.123/health | head -1

echo ""
echo "🛠️  Nginx Configuration Fix Required"
echo "===================================="
echo ""
echo "The issue is that the nginx configuration on the server needs to be updated."
echo "The current nginx config is missing the /chat-signaling location block."
echo ""
echo "Please run these commands on your server (46.101.123.123):"
echo ""
echo "1. Copy the new nginx configuration:"
echo "   sudo cp nginx-webrtc-proxy.conf /etc/nginx/sites-available/webrtc-proxy"
echo ""
echo "2. Enable the site:"
echo "   sudo ln -sf /etc/nginx/sites-available/webrtc-proxy /etc/nginx/sites-enabled/"
echo ""
echo "3. Test nginx configuration:"
echo "   sudo nginx -t"
echo ""
echo "4. Reload nginx:"
echo "   sudo systemctl reload nginx"
echo ""
echo "5. Verify the fix:"
echo "   curl -I http://46.101.123.123/chat-signaling/test123"
echo ""
echo "Expected result: HTTP/1.1 101 Switching Protocols"
echo ""
echo "📁 The nginx-webrtc-proxy.conf file is ready in your project directory."
echo "   Upload it to your server and follow the steps above."
