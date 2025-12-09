# 🔧 WebSocket 400 Bad Request Fix Instructions

## 🎯 Issue Identified
The diagnostic confirms that the nginx configuration on your server is missing the `/chat-signaling` location block, causing 400 Bad Request errors.

**Current Status:**
- ✅ Audio Signaling via nginx (port 80): Working
- ❌ Chat Signaling via nginx (port 80): 400 Bad Request
- ✅ Audio Signaling direct (port 8080): Working  
- ✅ Chat Signaling direct (port 8080): Working

## 🛠️ Solution Steps

### Step 1: Deploy Nginx Configuration
Upload the `nginx-webrtc-proxy.conf` file to your server and apply it:

```bash
# On your server (46.101.123.123)
sudo cp nginx-webrtc-proxy.conf /etc/nginx/sites-available/webrtc-proxy
sudo ln -sf /etc/nginx/sites-available/webrtc-proxy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 2: Verify the Fix
Test the WebSocket connections:

```bash
# Test chat signaling via nginx
curl -I http://46.101.123.123/chat-signaling/test123

# Expected result: HTTP/1.1 101 Switching Protocols
```

### Step 3: Run Diagnostic
Use the diagnostic tool to verify all connections:

```bash
node diagnose-websocket-issue.js
```

## 📁 Files Ready for Deployment

1. **`nginx-webrtc-proxy.conf`** - Clean nginx configuration with both audio and chat signaling
2. **`diagnose-websocket-issue.js`** - Diagnostic tool to test all connections
3. **`test-websocket-fix.js`** - Comprehensive test suite

## 🔍 What Was Fixed

### Client Configuration Updates:
- ✅ `app.config.js` - Fixed WebSocket URLs to use consistent ports
- ✅ `services/configService.ts` - Updated to use correct URLs
- ✅ `services/instantSessionMessageDetector.ts` - Fixed port reference

### Nginx Configuration:
- ✅ Fixed corrupted nginx config file
- ✅ Added proper WebSocket upgrade headers
- ✅ Configured both `/audio-signaling` and `/chat-signaling` paths
- ✅ Set correct proxy targets to `localhost:8080`

## 🚀 Expected Results After Fix

After deploying the nginx configuration:

- ✅ `ws://46.101.123.123/audio-signaling` - Working
- ✅ `ws://46.101.123.123/chat-signaling` - Working  
- ✅ No more 400 Bad Request errors
- ✅ Proper WebSocket upgrade handshake
- ✅ Real-time messaging and audio calls working

## 🆘 Troubleshooting

If issues persist after deployment:

1. **Check nginx logs:**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

2. **Verify nginx configuration:**
   ```bash
   sudo nginx -t
   ```

3. **Check WebRTC server status:**
   ```bash
   curl http://46.101.123.123:8080/health
   ```

4. **Test individual endpoints:**
   ```bash
   node diagnose-websocket-issue.js
   ```

## 📞 Support

The fix addresses the root cause: **missing nginx configuration for chat signaling**. Once deployed, all WebSocket connections should work perfectly.
