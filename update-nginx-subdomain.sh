#!/bin/bash

# Simple script to add subdomain to existing nginx configuration
# This modifies your existing nginx config to handle the new subdomain

echo "🔧 Adding subdomain to existing nginx configuration..."

# Find your nginx config file (adjust path if needed)
NGINX_CONFIG="/etc/nginx/sites-available/webrtc-proxy"

if [ ! -f "$NGINX_CONFIG" ]; then
    echo "❌ Nginx config file not found at $NGINX_CONFIG"
    echo "Please specify the correct path to your nginx configuration file"
    exit 1
fi

echo "📁 Found nginx config: $NGINX_CONFIG"

# Backup the original config
cp "$NGINX_CONFIG" "$NGINX_CONFIG.backup.$(date +%Y%m%d_%H%M%S)"
echo "✅ Backup created: $NGINX_CONFIG.backup.$(date +%Y%m%d_%H%M%S)"

# Add subdomain to server_name line
sed -i 's/server_name 46.101.123.123;/server_name 46.101.123.123 webrtc.docavailable-3vbdv.ondigitalocean.app;/' "$NGINX_CONFIG"

echo "✅ Added subdomain to nginx configuration"

# Test nginx configuration
echo "🧪 Testing nginx configuration..."
if nginx -t; then
    echo "✅ Nginx configuration is valid"
    
    # Reload nginx
    systemctl reload nginx
    echo "✅ Nginx reloaded successfully"
    
    echo ""
    echo "🎉 Configuration updated successfully!"
    echo ""
    echo "📋 Your nginx now handles both:"
    echo "   - 46.101.123.123:8082 (existing)"
    echo "   - webrtc.docavailable-3vbdv.ondigitalocean.app:8082 (new)"
    echo ""
    echo "🧪 Test the setup:"
    echo "   curl -i http://webrtc.docavailable-3vbdv.ondigitalocean.app:8082/health"
    echo ""
    echo "📱 Ready to build production APK!"
    
else
    echo "❌ Nginx configuration test failed"
    echo "Restoring backup..."
    cp "$NGINX_CONFIG.backup.$(date +%Y%m%d_%H%M%S)" "$NGINX_CONFIG"
    exit 1
fi
