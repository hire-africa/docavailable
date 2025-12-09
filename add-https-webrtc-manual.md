# 🔧 Manual HTTPS WebRTC Configuration

## 🎯 **What You Need to Do**

Add HTTPS server block to handle `wss://` WebSocket connections on port 443.

## 📋 **Step 1: Find Your Main Nginx Config**

```bash
# SSH into your droplet
ssh root@46.101.123.123

# Find your main nginx config
ls -la /etc/nginx/sites-available/
grep -r "docavailable-3vbdv.ondigitalocean.app" /etc/nginx/
```

## 📋 **Step 2: Edit the Config File**

```bash
# Edit your main nginx config (replace with actual path)
sudo nano /etc/nginx/sites-available/docavailable-3vbdv.ondigitalocean.app
```

## 📋 **Step 3: Add HTTPS Server Block**

Add this to your nginx config file:

```nginx
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
```

## 📋 **Step 4: Test and Reload**

```bash
# Test nginx configuration
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx
```

## 📋 **Step 5: Test the Setup**

```bash
# Test WebSocket upgrade
curl -i -N https://docavailable-3vbdv.ondigitalocean.app/audio-signaling/test \
     -H "Connection: Upgrade" \
     -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Version: 13" \
     -H "Sec-WebSocket-Key: test"

# Expected result: HTTP/1.1 101 Switching Protocols
```

## 🎯 **What This Achieves**

- ✅ **HTTPS server**: Handles TLS termination on port 443
- ✅ **WSS support**: Secure WebSocket connections
- ✅ **WebRTC routing**: Proxies to your signaling servers
- ✅ **Android compatibility**: Works with production builds
- ✅ **Security**: Proper SSL/TLS configuration

## 📱 **Ready for Production**

After this setup:
- ✅ **WSS URLs work**: `wss://docavailable-3vbdv.ondigitalocean.app/audio-signaling`
- ✅ **Production APK works**: No more network security policy errors
- ✅ **Secure connections**: TLS encryption for WebRTC signaling

## 🔧 **Alternative: Use Existing HTTPS Block**

If you already have an HTTPS server block for your domain, just add these two location blocks to it:

```nginx
# Add these to your existing HTTPS server block
location ^~ /audio-signaling {
    proxy_pass http://127.0.0.1:8080;
    # ... (same proxy settings as above)
}

location ^~ /chat-signaling {
    proxy_pass http://127.0.0.1:8081;
    # ... (same proxy settings as above)
}
```
