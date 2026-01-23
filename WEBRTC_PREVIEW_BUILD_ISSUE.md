# 🔍 WebRTC Preview Build Issue - Root Cause Analysis

## 🚨 **Problem: Both Calls AND Chat Failing in Preview Builds**

Since **BOTH** video/audio calls AND chat are failing, this indicates a **fundamental WebRTC/WebSocket issue**.

## ✅ **What We Know:**

1. ✅ **SSL Certificate is CORRECT** - Verified with `test-ssl-certificate.js`
2. ✅ **WSS URLs are CORRECT** - `wss://docavailable.org/call-signaling` and `wss://docavailable.org/chat-signaling`
3. ✅ **It WAS working before** - You've been using WSS all this time
4. ❌ **Now failing in preview builds** - But works in development builds

## 🔍 **Possible Root Causes:**

### **1. React Native WebSocket SSL Validation in Preview Builds**
- Preview builds may have **stricter SSL validation** than development builds
- Even with valid certificates, React Native WebSocket might silently reject connections
- **Check**: Look for SSL errors in logs even though certificate is valid

### **2. Environment Variables Not Loading in OTA Updates**
- **CRITICAL**: OTA updates (Expo Updates) **DO NOT include environment variables**
- Environment variables are **baked into the build** at build time
- If your preview build was created **before** the env vars were set in `eas.json`, they won't be available
- **Solution**: Need to **rebuild** preview build, not just OTA update

### **3. WebSocket Connection Silently Failing**
- Connection appears to succeed (`onopen` fires) but doesn't actually work
- No error events fired
- Messages can't be sent/received
- **Check**: Look for test ping/pong logs

### **4. react-native-webrtc Native Module**
- Native modules require **rebuild**, not OTA update
- If `RTCPeerConnection` is undefined, WebRTC won't work
- **Check**: Look for `🔍 [VideoCallService] WebRTC availability check` logs

## 📋 **Diagnostics Added:**

All services now log:
- ✅ WebRTC availability (RTCPeerConnection, mediaDevices, etc.)
- ✅ URL resolution (where URLs come from)
- ✅ WebSocket connection state
- ✅ Test ping/pong to verify bidirectional communication
- ✅ Media stream track status (readyState, enabled)
- ✅ SSL certificate errors

## 🎯 **What to Check in Preview Build Logs:**

### **1. WebRTC Native Module:**
```
🔍 [VideoCallService] WebRTC availability check: { RTCPeerConnection: true/false, ... }
```
If `RTCPeerConnection: false` → **Need to rebuild** (native module not linked)

### **2. Environment Variables:**
```
🔍 [WebRTCChat] DIAGNOSTIC - URL Resolution: { fromConfig: ..., finalBase: ..., finalUrl: ... }
🔧 [ConfigService] Found EXPO_PUBLIC_WEBRTC_CHAT_SIGNALING_URL in process.env
```
If `fromConfig: undefined` and using fallback → **Env vars not loaded** (need rebuild)

### **3. WebSocket Connection:**
```
✅ [WebRTCChat] Test ping sent to verify WebSocket is working
🏓 [WebRTCChat] Pong received - WebSocket bidirectional communication confirmed
```
If ping sent but no pong → **WebSocket not actually working**

### **4. Media Streams:**
```
📹 [VideoCallService] Video track 0: { readyState: 'live'/'ended', enabled: true/false }
🎤 [VideoCallService] Audio track 0: { readyState: 'live'/'ended', enabled: true/false }
```
If `readyState: 'ended'` → **Media permissions or device access issue**

## 🔧 **Most Likely Issue:**

Since it **was working before** and now it's not, and you're using **OTA updates**, the most likely issue is:

**Environment variables are not available in the OTA update** because they're only baked into the build.

**Solution**: You need to **rebuild the preview build** so the environment variables from `eas.json` are included.

## 📝 **Next Steps:**

1. **Check the logs** from preview build for the diagnostic messages above
2. **If env vars are missing** → Rebuild preview build (not just OTA update)
3. **If WebRTC native module missing** → Rebuild preview build
4. **If WebSocket connects but no pong** → Server-side issue or connection not actually working
