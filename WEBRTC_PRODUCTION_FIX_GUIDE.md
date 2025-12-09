# 🔧 WebRTC Production Build Fix - Complete Guide

## 🚨 **Problem Summary**

Your WebRTC connections work in development but fail in production with "not permitted by network security policy" because:

1. **IP Address Restriction**: Android blocks cleartext connections to IP addresses in production
2. **Network Security Policy**: Android 9+ requires proper domain-based configuration
3. **Cleartext Protocol**: Using `ws://` instead of `wss://` for WebSocket connections

## ✅ **Solution Implemented**

### **1. Updated Network Security Configuration**

**File**: `android/app/src/main/res/xml/network_security_config.xml`

- ✅ **Secure by default**: `cleartextTrafficPermitted="false"` for base config
- ✅ **Domain-based allowlist**: Only allows cleartext to specific domains
- ✅ **WebRTC subdomain**: `webrtc.docavailable-3vbdv.ondigitalocean.app`
- ✅ **Removed IP address**: No longer trying to allow IP `46.101.123.123`

### **2. Updated WebRTC Configuration**

**Files Updated**:
- `app.config.js`
- `eas.json` 
- `services/configService.ts`

**Changes**:
- ✅ **Domain-based URLs**: `ws://webrtc.docavailable-3vbdv.ondigitalocean.app/`
- ✅ **Consistent across environments**: Same URLs for preview and production
- ✅ **Better Android compatibility**: Uses hostname instead of IP

## 🚀 **Server Setup Required**

### **Step 1: Create WebRTC Subdomain**

You need to set up a subdomain that points to your WebRTC server:

```bash
# Add DNS record for subdomain
webrtc.docavailable-3vbdv.ondigitalocean.app -> 46.101.123.123
```

### **Step 2: Configure Nginx Proxy**

Create or update your nginx configuration to handle the WebRTC subdomain:

```nginx
# /etc/nginx/sites-available/webrtc.docavailable-3vbdv.ondigitalocean.app
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
}
```

### **Step 3: Enable the Site**

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/webrtc.docavailable-3vbdv.ondigitalocean.app /etc/nginx/sites-enabled/

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

## 🔐 **Optional: SSL/TLS Setup (Recommended)**

For even better security, set up SSL certificates:

### **Step 1: Install Certbot**

```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx
```

### **Step 2: Get SSL Certificate**

```bash
sudo certbot --nginx -d webrtc.docavailable-3vbdv.ondigitalocean.app
```

### **Step 3: Update Configuration for HTTPS**

If you set up SSL, update the WebRTC URLs to use `wss://`:

```javascript
// In app.config.js and eas.json
signalingUrl: 'wss://webrtc.docavailable-3vbdv.ondigitalocean.app/audio-signaling',
chatSignalingUrl: 'wss://webrtc.docavailable-3vbdv.ondigitalocean.app/chat-signaling',
```

## 🧪 **Testing the Fix**

### **1. Test WebRTC Subdomain**

```bash
# Test if subdomain resolves
nslookup webrtc.docavailable-3vbdv.ondigitalocean.app

# Test WebSocket connection
curl -i -N -H "Connection: Upgrade" \
     -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Version: 13" \
     -H "Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==" \
     http://webrtc.docavailable-3vbdv.ondigitalocean.app/audio-signaling/test
```

### **2. Build and Test Production APK**

```bash
# Build production APK
eas build --platform android --profile production

# Install and test WebRTC features
# - Audio calls
# - Video calls  
# - Chat messaging
```

## 📋 **Verification Checklist**

- [ ] DNS record created for `webrtc.docavailable-3vbdv.ondigitalocean.app`
- [ ] Nginx proxy configured and enabled
- [ ] WebRTC server running on port 8080
- [ ] Network security config updated (✅ Done)
- [ ] App configuration updated (✅ Done)
- [ ] Production APK built and tested
- [ ] WebRTC features working in production

## 🚨 **If Issues Persist**

### **Alternative Solution: Use IP with Different Approach**

If you can't set up the subdomain immediately, you can temporarily use this approach:

1. **Update network security config** to allow all cleartext traffic (less secure):

```xml
<base-config cleartextTrafficPermitted="true">
    <trust-anchors>
        <certificates src="system"/>
    </trust-anchors>
</base-config>
```

2. **Revert URLs** back to IP addresses in configuration files

3. **Test and then implement proper domain-based solution**

## 🎯 **Expected Results**

After implementing this fix:

- ✅ **Production APK**: WebRTC connections will work
- ✅ **Better Security**: Domain-based configuration is more secure
- ✅ **Android Compatibility**: Follows Android security best practices
- ✅ **Future-Proof**: Easy to add SSL/TLS later

## 📞 **Support**

If you encounter issues:

1. Check nginx error logs: `sudo tail -f /var/log/nginx/error.log`
2. Verify WebRTC server is running: `sudo netstat -tlnp | grep 8080`
3. Test DNS resolution: `nslookup webrtc.docavailable-3vbdv.ondigitalocean.app`
4. Check Android logs for network security errors

The key insight is that **Android's network security policy prefers hostnames over IP addresses** for cleartext traffic exceptions. This solution provides a proper, secure, and Android-compliant approach to WebRTC connections in production builds.
