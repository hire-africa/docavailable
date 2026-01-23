#!/bin/bash

# SSL Certificate Verification Script for DocAvailable
# Quick command-line tool to check SSL certificate status

echo "🔒 SSL Certificate Verification for DocAvailable"
echo "=================================================="
echo ""

# Function to check certificate
check_cert() {
    local domain=$1
    local port=${2:-443}
    local path=$3
    
    echo "📋 Checking: $domain:$port$path"
    echo "-----------------------------------"
    
    # Get certificate details
    echo | openssl s_client -servername "$domain" -connect "$domain:$port" 2>/dev/null | openssl x509 -noout -dates -subject -issuer 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "✅ Certificate is valid and accessible"
        
        # Check expiration
        expiry_date=$(echo | openssl s_client -servername "$domain" -connect "$domain:$port" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
        expiry_epoch=$(date -d "$expiry_date" +%s 2>/dev/null || date -j -f "%b %d %H:%M:%S %Y %Z" "$expiry_date" +%s 2>/dev/null)
        now_epoch=$(date +%s)
        days_left=$(( ($expiry_epoch - $now_epoch) / 86400 ))
        
        if [ $days_left -lt 0 ]; then
            echo "❌ CERTIFICATE EXPIRED! Expired $((-$days_left)) days ago"
        elif [ $days_left -lt 30 ]; then
            echo "⚠️  CERTIFICATE EXPIRING SOON! Expires in $days_left days"
        else
            echo "✅ Certificate valid for $days_left more days"
        fi
    else
        echo "❌ Failed to retrieve certificate"
    fi
    
    echo ""
}

# Check main domain
check_cert "docavailable.org" 443

# Check WebRTC endpoints (these will show the same certificate)
echo "Note: WebRTC endpoints (wss://docavailable.org/call-signaling, wss://docavailable.org/chat-signaling)"
echo "      use the same SSL certificate as the main domain."
echo ""

# Alternative: Use curl to check
echo "🔍 Alternative check using curl:"
curl -vI https://docavailable.org 2>&1 | grep -i "certificate\|SSL\|TLS" | head -5
echo ""

echo "✅ Verification complete"
echo ""
echo "To test WebSocket connections specifically, run:"
echo "  node test-ssl-certificate.js"
