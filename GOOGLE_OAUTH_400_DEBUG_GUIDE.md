# 🔍 Google OAuth 400 Error - Advanced Debugging Guide

## 🚨 **Current Status**
- ✅ Client ID: `584940778531-f1n0j5i8a7bd7hm8g57fbafk0falikbv.apps.googleusercontent.com`
- ✅ Client Secret: `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`
- ✅ Redirect URI: `https://docavailable-3vbdv.ondigitalocean.app`
- ❌ Still getting 400 error

## 🔍 **Enhanced Debugging Steps**

### **1. Check Console Logs**
After the update, you should see these logs in your browser console:

```javascript
Google OAuth Config: {
  clientId: "584940778531-f1n0j5i8a7bd7hm8g57fbafk0falikbv.apps.googleusercontent.com",
  redirectUri: "https://docavailable-3vbdv.ondigitalocean.app",
  platform: "web",
  scopes: ["openid", "profile", "email"]
}

AuthRequest Config: {
  clientId: "584940778531-f1n0j5i8a7bd7hm8g57fbafk0falikbv.apps.googleusercontent.com",
  scopes: ["openid", "profile", "email"],
  redirectUri: "https://docavailable-3vbdv.ondigitalocean.app",
  responseType: "code",
  extraParams: { access_type: "offline" }
}

Google OAuth Error Details: {
  error: "invalid_request", // or other specific error
  errorCode: "400",
  params: { ... },
  fullResult: { ... }
}
```

### **2. Common 400 Error Causes**

#### **A. OAuth Consent Screen Issues**
- **Problem**: App not verified or consent screen not configured
- **Solution**: 
  1. Go to [Google Cloud Console](https://console.cloud.google.com/)
  2. Navigate to **APIs & Services** → **OAuth consent screen**
  3. Make sure:
     - App name is set to "DocAvailable"
     - User support email is added
     - Scopes include: `openid`, `profile`, `email`
     - Test users include your email (for development)

#### **B. Client Type Mismatch**
- **Problem**: Using wrong client type (Web vs Mobile)
- **Solution**:
  1. Go to **APIs & Services** → **Credentials**
  2. Check if your client is "Web application" or "Mobile application"
  3. For web apps, it should be "Web application"
  4. If it's "Mobile application", create a new "Web application" client

#### **C. Redirect URI Format Issues**
- **Problem**: Redirect URI doesn't match exactly
- **Solution**: Ensure the redirect URI in Google Cloud Console is exactly:
  ```
  https://docavailable-3vbdv.ondigitalocean.app
  ```
  (No trailing slash, exact case)

#### **D. Missing Required APIs**
- **Problem**: Required APIs not enabled
- **Solution**:
  1. Go to **APIs & Services** → **Library**
  2. Enable these APIs:
     - **Google+ API** (if available)
     - **Google OAuth2 API**
     - **People API**

### **3. Test Different Redirect URIs**

Try these redirect URIs in your Google Cloud Console:
```
https://docavailable-3vbdv.ondigitalocean.app
http://localhost:3000
http://localhost:19006
docavailable://auth
```

### **4. Check OAuth Client Configuration**

In Google Cloud Console → Credentials → Your OAuth Client:

**Required Settings**:
- **Application type**: Web application
- **Name**: DocAvailable Web Client
- **Authorized JavaScript origins**: 
  ```
  https://docavailable-3vbdv.ondigitalocean.app
  http://localhost:3000
  ```
- **Authorized redirect URIs**:
  ```
  https://docavailable-3vbdv.ondigitalocean.app
  http://localhost:3000
  http://localhost:19006
  docavailable://auth
  ```

### **5. Test with Different Client**

If the issue persists, try creating a new OAuth client:

1. **Create New OAuth Client**:
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth 2.0 Client IDs**
   - Choose **Web application**
   - Name: "DocAvailable Web Client v2"
   - Add the redirect URIs above

2. **Update Environment Variables**:
   ```env
   EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-new-client-id
   EXPO_PUBLIC_GOOGLE_CLIENT_SECRET=your-new-client-secret
   ```

3. **Restart the app** and test

### **6. Check Browser Network Tab**

1. Open **Developer Tools** → **Network** tab
2. Click "Continue with Google"
3. Look for the OAuth request
4. Check the request URL and parameters
5. Look for any error responses

### **7. Verify OAuth Consent Screen Status**

The consent screen should show:
- **Status**: "Testing" or "In production"
- **Publishing status**: "In production" (for production apps)
- **Scopes**: `openid`, `profile`, `email`

## 🧪 **Quick Test**

1. **Refresh your page**
2. **Open browser console**
3. **Click "Continue with Google"**
4. **Check the console logs** for the detailed error information
5. **Share the exact error message** you see

## 🆘 **Still Not Working?**

If you're still getting the 400 error after trying these steps:

1. **Share the exact console logs** from the enhanced error handling
2. **Check the OAuth consent screen status** in Google Cloud Console
3. **Verify the client type** (should be "Web application")
4. **Try creating a new OAuth client** with the correct settings

The enhanced error logging will now show you the exact error details, which will help us identify the specific issue.

