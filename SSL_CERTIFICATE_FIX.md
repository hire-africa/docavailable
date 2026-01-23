# 🔒 SSL Certificate Mismatch Fix

## 🚨 Critical Issue Detected

The SSL certificate test revealed a **hostname mismatch**:

- **Certificate is for:** `usemaganyu.com`
- **Connecting to:** `docavailable.org`
- **Error:** `ERR_TLS_CERT_ALTNAME_INVALID`

This causes SSL validation failures in React Native, especially in preview/production builds which have stricter SSL validation.

## Impact

This explains all the WebRTC issues:
- ✅ Messages delayed 3-5 seconds → WebSocket SSL validation fails, falls back to HTTP polling
- ✅ Voice notes/images not sending → WebSocket connection fails due to SSL mismatch
- ✅ Calls connect but no audio/video → WebRTC signaling fails due to SSL mismatch

## Solutions

### Option 1: Fix Certificate (Recommended)

Update the SSL certificate on the server to include `docavailable.org`:

1. **If using Let's Encrypt:**
   ```bash
   certbot certonly --nginx -d docavailable.org -d www.docavailable.org
   ```

2. **Update nginx configuration** to use the correct certificate:
   ```nginx
   ssl_certificate /etc/letsencrypt/live/docavailable.org/fullchain.pem;
   ssl_certificate_key /etc/letsencrypt/live/docavailable.org/privkey.pem;
   ```

3. **Restart nginx:**
   ```bash
   sudo systemctl restart nginx
   ```

### Option 2: Use Correct Domain

If `usemaganyu.com` is the correct domain, update the app configuration:

1. Update `config/environment.ts`:
   ```typescript
   WEBRTC_SIGNALING_URL: 'wss://usemaganyu.com/call-signaling',
   WEBRTC_CHAT_SIGNALING_URL: 'wss://usemaganyu.com/chat-signaling',
   ```

2. Update `eas.json` preview build environment:
   ```json
   "EXPO_PUBLIC_WEBRTC_SIGNALING_URL": "wss://usemaganyu.com/call-signaling",
   "EXPO_PUBLIC_WEBRTC_CHAT_SIGNALING_URL": "wss://usemaganyu.com/chat-signaling"
   ```

### Option 3: Temporary Workaround (Use Fallback)

Use the non-SSL fallback endpoints temporarily:

1. The app already has fallback URLs configured:
   ```typescript
   WEBRTC_FALLBACK_SIGNALING_URL: 'ws://46.101.123.123:8080/call-signaling',
   WEBRTC_FALLBACK_CHAT_SIGNALING_URL: 'ws://46.101.123.123:8081/chat-signaling',
   ```

2. The services will automatically fall back if SSL fails, but this is **not secure** and should only be temporary.

## Verification

After fixing, run:
```bash
node test-ssl-certificate.js
```

You should see:
- ✅ HTTPS Connection: SUCCESS
- ✅ TLS Connection: SUCCESS
- ✅ Certificate matches domain
- ✅ No `ERR_TLS_CERT_ALTNAME_INVALID` errors

## Next Steps

1. **Immediate:** Check which domain is correct (`docavailable.org` or `usemaganyu.com`)
2. **Fix certificate or domain** based on Option 1 or 2 above
3. **Test** with `node test-ssl-certificate.js`
4. **Rebuild preview build** after fixing
5. **Test** WebRTC functionality in preview build
