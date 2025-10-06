#!/bin/bash

# WebRTC Subdomain Setup Script
# This script sets up the nginx configuration for webrtc.docavailable-3vbdv.ondigitalocean.app

echo "🔧 Setting up WebRTC subdomain configuration..."

# Create nginx configuration file
sudo tee /etc/nginx/sites-available/webrtc.docavailable-3vbdv.ondigitalocean.app > /dev/null << 'EOF'
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
}
EOF

echo "✅ Nginx configuration created"

# Enable the site
sudo ln -sf /etc/nginx/sites-available/webrtc.docavailable-3vbdv.ondigitalocean.app /etc/nginx/sites-enabled/

echo "✅ Site enabled"

# Test nginx configuration
echo "🧪 Testing nginx configuration..."
if sudo nginx -t; then
    echo "✅ Nginx configuration is valid"
    
    # Reload nginx
    sudo systemctl reload nginx
    echo "✅ Nginx reloaded successfully"
    
    echo ""
    echo "🎉 WebRTC subdomain setup complete!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Add DNS record: webrtc.docavailable-3vbdv.ondigitalocean.app -> 46.101.123.123"
    echo "2. Ensure WebRTC server is running on port 8080"
    echo "3. Test the connection: curl -i http://webrtc.docavailable-3vbdv.ondigitalocean.app/health"
    echo "4. Build and test your production APK"
    echo ""
    echo "🔍 To check if WebRTC server is running:"
    echo "   sudo netstat -tlnp | grep 8080"
    echo ""
    echo "📝 To view nginx logs:"
    echo "   sudo tail -f /var/log/nginx/access.log"
    echo "   sudo tail -f /var/log/nginx/error.log"
    
else
    echo "❌ Nginx configuration test failed"
    echo "Please check the configuration and try again"
    exit 1
fi
