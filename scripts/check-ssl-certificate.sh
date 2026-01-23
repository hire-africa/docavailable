#!/bin/bash

# SSL Certificate Diagnostic Script
# Checks which certificate is actually being served vs what's configured

echo "🔒 SSL Certificate Diagnostic Tool"
echo "===================================="
echo ""

DOMAIN="docavailable.org"
CERT_PATH="/etc/letsencrypt/live/docavailable.org/fullchain.pem"
KEY_PATH="/etc/letsencrypt/live/docavailable.org/privkey.pem"

echo "📋 Checking certificate files on server..."
echo ""

# Check if certificate file exists
if [ -f "$CERT_PATH" ]; then
    echo "✅ Certificate file exists: $CERT_PATH"
    
    # Get certificate details from file
    echo ""
    echo "📜 Certificate in file:"
    openssl x509 -in "$CERT_PATH" -noout -subject -issuer -dates 2>/dev/null | sed 's/^/   /'
    
    # Get Subject Alternative Names
    echo ""
    echo "📜 Subject Alternative Names (SANs):"
    openssl x509 -in "$CERT_PATH" -noout -text 2>/dev/null | grep -A1 "Subject Alternative Name" | sed 's/^/   /'
    
    # Check if certificate matches domain
    CERT_DOMAIN=$(openssl x509 -in "$CERT_PATH" -noout -subject 2>/dev/null | sed -n 's/.*CN=\([^,]*\).*/\1/p')
    if [ "$CERT_DOMAIN" = "$DOMAIN" ]; then
        echo ""
        echo "✅ Certificate CN matches domain: $DOMAIN"
    else
        echo ""
        echo "❌ Certificate CN mismatch!"
        echo "   Expected: $DOMAIN"
        echo "   Found: $CERT_DOMAIN"
    fi
else
    echo "❌ Certificate file NOT found: $CERT_PATH"
    echo ""
    echo "📋 Available certificates:"
    ls -la /etc/letsencrypt/live/ 2>/dev/null | sed 's/^/   /'
fi

echo ""
echo "===================================="
echo ""

# Check what certificate is actually being served
echo "🌐 Checking certificate served by server..."
echo ""

# Get certificate from server
echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -subject -issuer -dates 2>/dev/null | sed 's/^/   /'

# Get SANs from served certificate
echo ""
echo "📜 Subject Alternative Names from server:"
echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -text 2>/dev/null | grep -A1 "Subject Alternative Name" | sed 's/^/   /'

# Compare
SERVED_DOMAIN=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -subject 2>/dev/null | sed -n 's/.*CN=\([^,]*\).*/\1/p')

if [ "$SERVED_DOMAIN" = "$DOMAIN" ]; then
    echo ""
    echo "✅ Server is serving correct certificate for: $DOMAIN"
else
    echo ""
    echo "❌ Server is serving WRONG certificate!"
    echo "   Expected: $DOMAIN"
    echo "   Found: $SERVED_DOMAIN"
    echo ""
    echo "🔧 SOLUTION:"
    echo "   1. Reissue certificate for docavailable.org:"
    echo "      sudo certbot certonly --nginx -d docavailable.org"
    echo ""
    echo "   2. Or if certificate exists but nginx isn't using it:"
    echo "      sudo nginx -t  # Test config"
    echo "      sudo systemctl reload nginx  # Reload nginx"
fi

echo ""
echo "===================================="
echo "✅ Diagnostic complete"
