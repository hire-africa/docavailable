# 🔧 Google OAuth Redirect URI Fix

## 🚨 **Error Details**
- **Error**: `invalid_request`
- **Redirect URI**: `docavailable://auth`
- **Issue**: Google doesn't accept this redirect URI format

## ✅ **Solution: Update Redirect URI Format**

### **1. Update Google Cloud Console**

Go to [Google Cloud Console](https://console.cloud.google.com/) and update your OAuth client:

1. **Navigate to**: APIs & Services → Credentials
2. **Click on your OAuth 2.0 Client ID**: `584940778531-f1n0j5i8a7bd7hm8g57fbafk0falikbv.apps.googleusercontent.com`
3. **In "Authorized redirect URIs", replace**:
   ```
   ❌ docavailable://auth
   ```
   **With**:
   ```
   ✅ com.docavailable.app:/oauth2redirect
   ```

4. **Your complete redirect URIs should be**:
   ```
   https://docavailable-3vbdv.ondigitalocean.app
   http://localhost:3000
   http://localhost:19006
   com.docavailable.app:/oauth2redirect
   ```

5. **Click "Save"**

### **2. Code Changes Made**

I've updated the redirect URI in your code to use the correct format:

```typescript
// Before (incorrect)
const redirectUri = Platform.OS === 'web' 
    ? `${window.location.origin}` 
    : 'docavailable://auth';

// After (correct)
const redirectUri = Platform.OS === 'web' 
    ? `${window.location.origin}` 
    : 'com.docavailable.app:/oauth2redirect';
```

### **3. Redirect URI Format Rules**

Google OAuth requires specific redirect URI formats:

#### **For Web Applications**:
```
https://yourdomain.com
http://localhost:3000
```

#### **For Mobile Applications**:
```
com.yourapp.package:/oauth2redirect
com.yourapp.package:/callback
```

#### **❌ Invalid Formats**:
```
docavailable://auth          // Missing package name
com.docavailable.app://auth  // Wrong path
docavailable://              // Incomplete
```

#### **✅ Valid Formats**:
```
com.docavailable.app:/oauth2redirect
com.docavailable.app:/callback
com.docavailable.app:/auth
```

### **4. Test the Fix**

1. **Update Google Cloud Console** with the new redirect URI
2. **Restart your development server**:
   ```bash
   npm start
   ```
3. **Test Google Sign-In** - the error should be resolved

### **5. Expected Console Logs**

You should now see:
```javascript
Google OAuth Config: {
  clientId: "584940778531-f1n0j5i8a7bd7hm8g57fbafk0falikbv.apps.googleusercontent.com",
  redirectUri: "com.docavailable.app:/oauth2redirect",
  platform: "android",
  scopes: ["openid", "profile", "email"]
}
```

### **6. If Still Getting Errors**

If you still get errors after updating the redirect URI:

1. **Check the exact redirect URI** in Google Cloud Console matches exactly
2. **Verify there are no extra spaces** or characters
3. **Make sure the OAuth client type** is "Web application" (not "Mobile application")
4. **Check OAuth consent screen** is properly configured

### **7. Alternative Redirect URIs to Try**

If `com.docavailable.app:/oauth2redirect` doesn't work, try these:

```
com.docavailable.app:/callback
com.docavailable.app:/auth
com.docavailable.app:/oauth
```

Just make sure to add the same URI to your Google Cloud Console.

## 🎯 **Quick Action Required**

1. **Go to Google Cloud Console**
2. **Update redirect URI** to `com.docavailable.app:/oauth2redirect`
3. **Save changes**
4. **Test again**

The error should be resolved! 🚀
