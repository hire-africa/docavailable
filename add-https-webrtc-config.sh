#!/bin/bash

# Add HTTPS WebRTC configuration to existing nginx setup
# This script adds the necessary HTTPS server block for WSS connections

echo "🔧 Adding HTTPS WebRTC configuration to nginx..."

# Find the main nginx config file
MAIN_CONFIG="/etc/nginx/sites-available/docavailable-3vbdv.ondigitalocean.app"

if [ ! -f "$MAIN_CONFIG" ]; then
    echo "❌ Main nginx config not found at $MAIN_CONFIG"
    echo "📋 Please find your main nginx config file first:"
    echo "   ls -la /etc/nginx/sites-available/"
    echo "   grep -r 'docavailable-3vbdv.ondigitalocean.app' /etc/nginx/"
    exit 1
fi

echo "📁 Found main config: $MAIN_CONFIG"

# Backup the original config
cp "$MAIN_CONFIG" "$MAIN_CONFIG.backup.$(date +%Y%m%d_%H%M%S)"
echo "✅ Backup created: $MAIN_CONFIG.backup.$(date +%Y%m%d_%H%M%S)"

# Check if HTTPS server block already exists
if grep -q "listen 443" "$MAIN_CONFIG"; then
    echo "✅ HTTPS server block already exists"
    echo "📋 Adding WebRTC locations to existing HTTPS block..."
    
    # Add WebRTC locations to existing HTTPS block
    cat >> "$MAIN_CONFIG" << 'EOF'

    # WebRTC Audio Signaling Proxy (WSS)
    location ^~ /audio-signaling {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        proxy_connect_timeout 60;
        proxy_buffering off;
        proxy_cache off;
    }

    # WebRTC Chat Signaling Proxy (WSS)
    location ^~ /chat-signaling {
        proxy_pass http://127.0.0.1:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        proxy_connect_timeout 60;
        proxy_buffering off;
        proxy_cache off;
    }
EOF

else
    echo "📋 Creating new HTTPS server block with WebRTC support..."
    
    # Create new HTTPS server block
    cat >> "$MAIN_CONFIG" << 'EOF'

# HTTPS Server Block for WebRTC (WSS)
server {
    listen 443 ssl http2;
    server_name docavailable-3vbdv.ondigitalocean.app;

    # SSL Configuration (adjust paths as needed)
    ssl_certificate /etc/letsencrypt/live/docavailable-3vbdv.ondigitalocean.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/docavailable-3vbdv.ondigitalocean.app/privkey.pem;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # WebRTC Audio Signaling Proxy (WSS)
    location ^~ /audio-signaling {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        proxy_connect_timeout 60;
        proxy_buffering off;
        proxy_cache off;
    }

    # WebRTC Chat Signaling Proxy (WSS)
    location ^~ /chat-signaling {
        proxy_pass http://127.0.0.1:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        proxy_connect_timeout 60;
        proxy_buffering off;
        proxy_cache off;
    }

    # Default location for testing
    location / {
        return 200 "WebRTC HTTPS Server - OK";
        add_header Content-Type text/plain;
    }
}
EOF
fi

# Test nginx configuration
echo "🧪 Testing nginx configuration..."
if nginx -t; then
    echo "✅ Nginx configuration is valid"
    
    # Reload nginx
    systemctl reload nginx
    echo "✅ Nginx reloaded successfully"
    
    echo ""
    echo "🎉 HTTPS WebRTC configuration added successfully!"
    echo ""
    echo "📋 Your WebRTC endpoints are now available at:"
    echo "   - wss://docavailable-3vbdv.ondigitalocean.app/audio-signaling"
    echo "   - wss://docavailable-3vbdv.ondigitalocean.app/chat-signaling"
    echo ""
    echo "🧪 Test the setup:"
    echo "   curl -i -N https://docavailable-3vbdv.ondigitalocean.app/audio-signaling/test \\"
    echo "        -H \"Connection: Upgrade\" \\"
    echo "        -H \"Upgrade: websocket\" \\"
    echo "        -H \"Sec-WebSocket-Version: 13\" \\"
    echo "        -H \"Sec-WebSocket-Key: test\""
    echo ""
    echo "📱 Ready to build production APK with WSS URLs!"
    
else
    echo "❌ Nginx configuration test failed"
    echo "Restoring backup..."
    cp "$MAIN_CONFIG.backup.$(date +%Y%m%d_%H%M%S)" "$MAIN_CONFIG"
    exit 1
fi
