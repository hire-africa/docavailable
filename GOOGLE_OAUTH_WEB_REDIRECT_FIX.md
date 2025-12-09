# 🌐 Google OAuth Web Redirect URI Fix

## 🚨 **Current Error**
- **Error**: `custom scheme urls are not allowed for web`
- **Error Code**: `400 invalid request`
- **Issue**: Using mobile app redirect URI format on web platform

## ✅ **Solution: Use Web-Appropriate Redirect URI**

### **1. Update Google Cloud Console**

Go to [Google Cloud Console](https://console.cloud.google.com/) and ensure you have the correct redirect URIs:

1. **Navigate to**: APIs & Services → Credentials
2. **Click on your OAuth 2.0 Client ID**: `584940778531-f1n0j5i8a7bd7hm8g57fbafk0falikbv.apps.googleusercontent.com`
3. **In "Authorized redirect URIs", make sure you have**:
   ```
   https://docavailable-3vbdv.ondigitalocean.app
   http://localhost:3000
   http://localhost:19006
   ```
4. **Remove any mobile app redirect URIs** like:
   ```
   ❌ com.docavailable.app:/oauth2redirect
   ❌ com.docavailable.minimal:/oauth2redirect
   ```

### **2. Code Changes Made**

I've updated the code to properly detect the platform and use the correct redirect URI:

```typescript
// Platform-specific redirect URI logic
const redirectUri = Platform.OS === 'web' 
    ? `${window.location.origin}`  // For web: https://docavailable-3vbdv.ondigitalocean.app
    : Platform.OS === 'android' 
        ? 'com.docavailable.app:/oauth2redirect'      // For Android
        : 'com.docavailable.minimal:/oauth2redirect'; // For iOS
```

### **3. Expected Console Logs**

When you test on web, you should see:
```javascript
Platform Detection: {
  PlatformOS: "web",
  windowLocation: "https://docavailable-3vbdv.ondigitalocean.app",
  isWeb: true
}

Google OAuth Config: {
  clientId: "584940778531-f1n0j5i8a7bd7hm8g57fbafk0falikbv.apps.googleusercontent.com",
  redirectUri: "https://docavailable-3vbdv.ondigitalocean.app",
  platform: "web",
  scopes: ["openid", "profile", "email"]
}
```

### **4. Redirect URI Rules by Platform**

#### **🌐 Web Applications**:
```
✅ https://yourdomain.com
✅ http://localhost:3000
✅ http://localhost:19006
❌ com.yourapp.package:/oauth2redirect
❌ custom-scheme://auth
```

#### **📱 Mobile Applications**:
```
✅ com.yourapp.package:/oauth2redirect
✅ com.yourapp.package:/callback
❌ https://yourdomain.com (for native mobile apps)
```

### **5. Test the Fix**

1. **Make sure Google Cloud Console** has the web redirect URIs
2. **Restart your development server**:
   ```bash
   npm start
   ```
3. **Test on web** - the error should be resolved
4. **Check console logs** to verify the correct redirect URI is being used

### **6. If Still Getting Errors**

Check these common issues:

1. **OAuth Client Type**: Should be "Web application" (not "Mobile application")
2. **Redirect URI Match**: Must match exactly in Google Cloud Console
3. **HTTPS Required**: Production domains must use HTTPS
4. **No Trailing Slash**: Don't add trailing slashes to redirect URIs

### **7. Complete Google Cloud Console Setup**

Your OAuth client should have:

**Application Type**: Web application
**Name**: DocAvailable Web Client
**Authorized JavaScript origins**:
```
https://docavailable-3vbdv.ondigitalocean.app
http://localhost:3000
```

**Authorized redirect URIs**:
```
https://docavailable-3vbdv.ondigitalocean.app
http://localhost:3000
http://localhost:19006
```

## 🎯 **Quick Action**

1. **Update Google Cloud Console** with web redirect URIs only
2. **Remove mobile app redirect URIs** from web OAuth client
3. **Test again** - should work on web now!

The key is using the correct redirect URI format for each platform! 🚀

