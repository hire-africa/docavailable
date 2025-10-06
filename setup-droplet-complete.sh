#!/bin/bash

# Complete WebRTC Setup Script for DigitalOcean Droplet
# Run this script on your droplet (46.101.123.123) as root

echo "🚀 Setting up WebRTC subdomain on DigitalOcean Droplet..."
echo "📍 Server: 46.101.123.123"
echo "🌐 Domain: webrtc.docavailable-3vbdv.ondigitalocean.app"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run this script as root"
    echo "   sudo $0"
    exit 1
fi

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install nginx if not installed
if ! command -v nginx &> /dev/null; then
    echo "📦 Installing nginx..."
    apt install nginx -y
    systemctl enable nginx
    systemctl start nginx
fi

# Create nginx configuration for WebRTC subdomain
echo "🔧 Creating nginx configuration..."
cat > /etc/nginx/sites-available/webrtc.docavailable-3vbdv.ondigitalocean.app << 'EOF'
server {
    listen 80;
    server_name webrtc.docavailable-3vbdv.ondigitalocean.app;

    # WebRTC Audio Signaling Proxy
    location /audio-signaling {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket specific settings
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        proxy_connect_timeout 60;
    }

    # WebRTC Chat Signaling Proxy
    location /chat-signaling {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket specific settings
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        proxy_connect_timeout 60;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:8080/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Default location for testing
    location / {
        return 200 "WebRTC Signaling Server - OK";
        add_header Content-Type text/plain;
    }
}
EOF

# Enable the site
echo "🔗 Enabling nginx site..."
ln -sf /etc/nginx/sites-available/webrtc.docavailable-3vbdv.ondigitalocean.app /etc/nginx/sites-enabled/

# Test nginx configuration
echo "🧪 Testing nginx configuration..."
if nginx -t; then
    echo "✅ Nginx configuration is valid"
    
    # Reload nginx
    systemctl reload nginx
    echo "✅ Nginx reloaded successfully"
else
    echo "❌ Nginx configuration test failed"
    exit 1
fi

# Check if WebRTC server is running
echo "🔍 Checking WebRTC server status..."
if netstat -tlnp | grep -q ":8080"; then
    echo "✅ WebRTC server is running on port 8080"
    netstat -tlnp | grep ":8080"
else
    echo "⚠️  WebRTC server is not running on port 8080"
    echo "   Please start your WebRTC signaling server"
fi

# Install certbot for SSL (optional)
echo "🔐 Installing Certbot for SSL certificates..."
apt install certbot python3-certbot-nginx -y

echo ""
echo "🎉 Server setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Add DNS record in DigitalOcean:"
echo "   - Go to: https://cloud.digitalocean.com"
echo "   - Networking → Domains → docavailable-3vbdv.ondigitalocean.app"
echo "   - Add A record: webrtc → 46.101.123.123"
echo ""
echo "2. Wait for DNS propagation (5-15 minutes)"
echo ""
echo "3. Test the setup:"
echo "   curl -i http://webrtc.docavailable-3vbdv.ondigitalocean.app/health"
echo ""
echo "4. Optional - Get SSL certificate:"
echo "   certbot --nginx -d webrtc.docavailable-3vbdv.ondigitalocean.app"
echo ""
echo "5. Build and test your production APK"
echo ""
echo "🔍 Useful commands:"
echo "   - Check nginx status: systemctl status nginx"
echo "   - View nginx logs: tail -f /var/log/nginx/access.log"
echo "   - Check WebRTC server: netstat -tlnp | grep 8080"
echo "   - Test DNS: nslookup webrtc.docavailable-3vbdv.ondigitalocean.app"
