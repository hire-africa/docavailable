# 🔧 Google Sign-In DEVELOPER_ERROR Fix Guide

## 🚨 **The Problem**
You're getting `DEVELOPER_ERROR: Follow troubleshooting instructions` because your Google Cloud Console configuration doesn't match your app configuration.

## 🔍 **Root Causes**
1. **Missing OAuth Client Configuration** - Your `google-services.json` has empty `oauth_client` array
2. **Incorrect iOS URL Scheme** - Must start with `com.googleusercontent.apps`
3. **Missing SHA-1 Fingerprint** - Required for Android authentication

## 🛠️ **Step-by-Step Fix**

### **Step 1: Update Google Cloud Console**

1. **Go to**: [Google Cloud Console](https://console.cloud.google.com/)
2. **Select your project**: `doc-push` (Project ID: 327624693503)
3. **Navigate to**: APIs & Services → Credentials

### **Step 2: Create/Update OAuth 2.0 Client ID**

#### **For Android:**
1. **Click**: "Create Credentials" → "OAuth 2.0 Client ID"
2. **Application type**: Android
3. **Package name**: `com.docavailable.app`
4. **SHA-1 fingerprint**: Get this from EAS (see Step 3)

#### **For iOS:**
1. **Click**: "Create Credentials" → "OAuth 2.0 Client ID"  
2. **Application type**: iOS
3. **Bundle ID**: `com.docavailable.app`

#### **For Web (Server):**
1. **Click**: "Create Credentials" → "OAuth 2.0 Client ID"
2. **Application type**: Web application
3. **Name**: DocAvailable Web Client
4. **Authorized redirect URIs**:
   - `https://docavailable-3vbdv.ondigitalocean.app/api/oauth/callback`
   - `https://docavailable-3vbdv.ondigitalocean.app/oauth-redirect.html`

### **Step 3: Get SHA-1 Fingerprint**

Run this command to get your SHA-1 fingerprint:

```bash
# For EAS builds
npx eas credentials

# Or manually get from keystore
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

### **Step 4: Update google-services.json**

After creating the OAuth clients, download the new `google-services.json` from Firebase Console:

1. **Go to**: [Firebase Console](https://console.firebase.google.com/)
2. **Select project**: `doc-push`
3. **Go to**: Project Settings → General
4. **Download**: `google-services.json` for Android
5. **Replace**: Your current `google-services.json` file

### **Step 5: Verify Configuration**

Your `google-services.json` should now have:

```json
{
  "client": [
    {
      "oauth_client": [
        {
          "client_id": "YOUR_ANDROID_CLIENT_ID",
          "client_type": 1,
          "android_info": {
            "package_name": "com.docavailable.app",
            "certificate_hash": "YOUR_SHA1_FINGERPRINT"
          }
        },
        {
          "client_id": "YOUR_WEB_CLIENT_ID", 
          "client_type": 3
        }
      ]
    }
  ]
}
```

### **Step 6: Rebuild Development Client**

After updating configuration:

```bash
# Clear cache
npx expo start --clear

# Rebuild development client
npx eas build --profile development --platform android
```

## 🔍 **Troubleshooting**

### **If you still get DEVELOPER_ERROR:**

1. **Check package name**: Must match exactly `com.docavailable.app`
2. **Verify SHA-1**: Must match the one in Google Console
3. **Check webClientId**: Must be the WEB client ID, not Android
4. **Clear app data**: Uninstall and reinstall the app

### **Common Mistakes:**
- ❌ Using Android client ID as webClientId
- ❌ Wrong package name in Google Console
- ❌ Missing SHA-1 fingerprint
- ❌ Using old google-services.json

### **Verification Commands:**

```bash
# Check if Google Sign-In is properly linked
npx expo config --type introspect

# Verify environment variables
npx expo config --type public
```

## ✅ **Expected Result**

After fixing, you should see:
- ✅ Google Sign-In modal appears
- ✅ No DEVELOPER_ERROR
- ✅ Successful authentication
- ✅ User data returned

## 📞 **Need Help?**

If you're still having issues:
1. Run `npx @react-native-google-signin/config-doctor` (requires subscription)
2. Check the [official troubleshooting guide](https://react-native-google-signin.github.io/docs/troubleshooting)
3. Verify all steps were followed correctly
