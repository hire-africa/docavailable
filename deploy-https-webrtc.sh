#!/bin/bash

# Deploy HTTPS WebRTC Configuration to DigitalOcean Droplet
# This script sets up the complete HTTPS WebRTC configuration

echo "🚀 Deploying HTTPS WebRTC configuration to droplet..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run this script as root"
    echo "   sudo $0"
    exit 1
fi

# Configuration file
CONFIG_FILE="/etc/nginx/sites-available/https-webrtc"
BACKUP_FILE="/etc/nginx/sites-available/https-webrtc.backup.$(date +%Y%m%d_%H%M%S)"

echo "📁 Creating nginx configuration file..."

# Create the nginx configuration
cat > "$CONFIG_FILE" << 'EOF'
# HTTPS WebRTC Configuration for docavailable-3vbdv.ondigitalocean.app
# This file handles WSS (WebSocket Secure) connections for WebRTC signaling

server {
    listen 443 ssl http2;
    server_name docavailable-3vbdv.ondigitalocean.app;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/docavailable-3vbdv.ondigitalocean.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/docavailable-3vbdv.ondigitalocean.app/privkey.pem;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384:DHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;

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
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        
        # WebSocket specific settings
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        proxy_connect_timeout 60;
        proxy_buffering off;
        proxy_cache off;
        proxy_request_buffering off;
        
        # CORS headers for WebRTC
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization" always;
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
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        
        # WebSocket specific settings
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        proxy_connect_timeout 60;
        proxy_buffering off;
        proxy_cache off;
        proxy_request_buffering off;
        
        # CORS headers for WebRTC
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization" always;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:8080/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers
        add_header Access-Control-Allow-Origin "*" always;
    }

    # Default location for testing
    location / {
        return 200 "WebRTC HTTPS Server - OK\n\nAvailable endpoints:\n- wss://docavailable-3vbdv.ondigitalocean.app/audio-signaling\n- wss://docavailable-3vbdv.ondigitalocean.app/chat-signaling\n- https://docavailable-3vbdv.ondigitalocean.app/health";
        add_header Content-Type text/plain;
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name docavailable-3vbdv.ondigitalocean.app;
    
    # Redirect all HTTP traffic to HTTPS
    return 301 https://$server_name$request_uri;
}
EOF

echo "✅ Configuration file created: $CONFIG_FILE"

# Enable the site
echo "🔗 Enabling nginx site..."
ln -sf "$CONFIG_FILE" /etc/nginx/sites-enabled/

# Check if SSL certificates exist
echo "🔍 Checking SSL certificates..."
if [ ! -f "/etc/letsencrypt/live/docavailable-3vbdv.ondigitalocean.app/fullchain.pem" ]; then
    echo "⚠️  SSL certificates not found!"
    echo "📋 You need to get SSL certificates first:"
    echo "   sudo certbot --nginx -d docavailable-3vbdv.ondigitalocean.app"
    echo ""
    echo "🔄 Or if you have certificates elsewhere, update the paths in:"
    echo "   $CONFIG_FILE"
    echo ""
    echo "📋 Current SSL paths in config:"
    echo "   ssl_certificate /etc/letsencrypt/live/docavailable-3vbdv.ondigitalocean.app/fullchain.pem;"
    echo "   ssl_certificate_key /etc/letsencrypt/live/docavailable-3vbdv.ondigitalocean.app/privkey.pem;"
    echo ""
    echo "❌ Cannot proceed without SSL certificates"
    exit 1
fi

echo "✅ SSL certificates found"

# Test nginx configuration
echo "🧪 Testing nginx configuration..."
if nginx -t; then
    echo "✅ Nginx configuration is valid"
    
    # Reload nginx
    systemctl reload nginx
    echo "✅ Nginx reloaded successfully"
    
    echo ""
    echo "🎉 HTTPS WebRTC configuration deployed successfully!"
    echo ""
    echo "📋 Your WebRTC endpoints are now available at:"
    echo "   - wss://docavailable-3vbdv.ondigitalocean.app/audio-signaling"
    echo "   - wss://docavailable-3vbdv.ondigitalocean.app/chat-signaling"
    echo "   - https://docavailable-3vbdv.ondigitalocean.app/health"
    echo ""
    echo "🧪 Test the setup:"
    echo "   curl -i https://docavailable-3vbdv.ondigitalocean.app/health"
    echo ""
    echo "   curl -i -N https://docavailable-3vbdv.ondigitalocean.app/audio-signaling/test \\"
    echo "        -H \"Connection: Upgrade\" \\"
    echo "        -H \"Upgrade: websocket\" \\"
    echo "        -H \"Sec-WebSocket-Version: 13\" \\"
    echo "        -H \"Sec-WebSocket-Key: test\""
    echo ""
    echo "📱 Ready to build production APK with WSS URLs!"
    
else
    echo "❌ Nginx configuration test failed"
    echo "Please check the configuration and try again"
    exit 1
fi
