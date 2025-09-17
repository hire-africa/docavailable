# 🔧 Google OAuth 400 Error Fix Guide

## 🚨 **Current Issue: Google OAuth 400 Error**

The Google OAuth 400 error typically occurs due to configuration mismatches between your app and Google Cloud Console.

## 🔍 **Root Causes & Solutions**

### **1. Redirect URI Mismatch (Most Common)**

**Problem**: The redirect URI in your app doesn't match what's configured in Google Cloud Console.

**Solution**: Update your Google Cloud Console with the correct redirect URIs:

#### **For Web App**:
```
http://localhost:3000
http://localhost:19006
https://docavailable-3vbdv.ondigitalocean.app
```

#### **For Mobile App**:
```
docavailable://auth
com.docavailable.app://auth
com.docavailable.minimal://auth
```

### **2. Client ID Configuration**

**Current Client ID**: `584940778531-f1n0j5i8a7bd7hm8g57fbafk0falikbv.apps.googleusercontent.com`

**Check**: Ensure this Client ID is correctly configured in Google Cloud Console.

### **3. OAuth Consent Screen Setup**

**Required Steps**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **OAuth consent screen**
4. Configure:
   - **App name**: `DocAvailable`
   - **User support email**: Your email
   - **Developer contact**: Your email
5. Add scopes: `openid`, `profile`, `email`
6. Add test users (for development)

### **4. API Enablement**

**Required APIs**:
1. Go to **APIs & Services** → **Library**
2. Enable these APIs:
   - **Google+ API** (if available)
   - **Google OAuth2 API**
   - **People API**

## 🔧 **Code Changes Made**

### **1. Dynamic Redirect URI**
```typescript
// Platform-specific redirect URI
const redirectUri = Platform.OS === 'web' 
    ? `${window.location.origin}` 
    : 'docavailable://auth';
```

### **2. Enhanced Error Logging**
```typescript
console.log('Google OAuth Config:', {
    clientId: GOOGLE_OAUTH_CONFIG.clientId,
    redirectUri,
    platform: Platform.OS,
    scopes: GOOGLE_OAUTH_CONFIG.scopes
});
```

### **3. Better Error Handling**
```typescript
if (result.errorCode === '400') {
    errorMessage = 'Invalid Google OAuth configuration. Please check your Google Cloud Console settings.';
    errorTitle = 'Configuration Error';
} else if (result.errorCode === 'redirect_uri_mismatch') {
    errorMessage = 'Redirect URI mismatch. Please check your Google Cloud Console redirect URIs.';
    errorTitle = 'Redirect URI Error';
}
```

## 🧪 **Testing Steps**

### **1. Check Console Logs**
Run the app and check the console for:
```
Google OAuth Config: {
  clientId: "584940778531-f1n0j5i8a7bd7hm8g57fbafk0falikbv.apps.googleusercontent.com",
  redirectUri: "http://localhost:3000", // or "docavailable://auth"
  platform: "web", // or "ios"/"android"
  scopes: ["openid", "profile", "email"]
}
```

### **2. Test Different Platforms**
- **Web**: Should use `http://localhost:3000` or your domain
- **Mobile**: Should use `docavailable://auth`

### **3. Verify Google Cloud Console**
1. Go to **APIs & Services** → **Credentials**
2. Click on your OAuth 2.0 Client ID
3. Check **Authorized redirect URIs** section
4. Ensure all required URIs are listed

## 🚀 **Quick Fix Checklist**

- [ ] Add redirect URIs to Google Cloud Console
- [ ] Verify OAuth consent screen is configured
- [ ] Enable required APIs
- [ ] Test with console logs enabled
- [ ] Check for 400 error details in console

## 📱 **Platform-Specific Redirect URIs**

### **Web Development**:
```
http://localhost:3000
http://localhost:19006
```

### **Web Production**:
```
https://docavailable-3vbdv.ondigitalocean.app
```

### **Mobile Development**:
```
docavailable://auth
```

### **Mobile Production**:
```
com.docavailable.app://auth
com.docavailable.minimal://auth
```

## 🔍 **Debugging Commands**

### **Check Current Configuration**:
```bash
# Check if environment variables are loaded
echo $EXPO_PUBLIC_GOOGLE_CLIENT_ID
echo $EXPO_PUBLIC_GOOGLE_CLIENT_SECRET
```

### **Test OAuth Flow**:
1. Open browser dev tools
2. Go to login page
3. Click "Continue with Google"
4. Check console for OAuth config logs
5. Look for 400 error details

## ✅ **Expected Result**

After fixing the configuration:
1. Google OAuth popup should open
2. User can sign in with Google
3. No 400 errors in console
4. User gets redirected to appropriate dashboard or signup page

## 🆘 **Still Getting 400 Error?**

1. **Check Google Cloud Console**:
   - Verify redirect URIs match exactly
   - Check OAuth consent screen status
   - Ensure APIs are enabled

2. **Check Console Logs**:
   - Look for the exact error message
   - Verify client ID is correct
   - Check redirect URI format

3. **Test with Different URIs**:
   - Try `http://localhost:3000` for web
   - Try `docavailable://auth` for mobile
   - Add both to Google Cloud Console

4. **Contact Support**:
   - If still having issues, check Google Cloud Console error logs
   - Verify project permissions and billing
