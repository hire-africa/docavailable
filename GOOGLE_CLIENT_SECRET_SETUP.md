# 🔐 Google Client Secret Setup Guide

## ✅ **Current Status**

- ✅ **Client ID**: `584940778531-fncqbp1secm3v81kbp2sfrqk1ullt7uq.apps.googleusercontent.com`
- ✅ **Project ID**: `doctorsavailable`
- ⚠️ **Client Secret**: Need to get this from Google Cloud Console

## 🚨 **Getting Your Client Secret**

### **Option 1: Check Existing Credentials**

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Select Project**: `doctorsavailable`
3. **Navigate to**: APIs & Services → Credentials
4. **Find Your OAuth Client**: Look for the client ID `584940778531-fncqbp1secm3v81kbp2sfrqk1ullt7uq`
5. **Click on the Client**: This will show you the client secret

### **Option 2: Create Web Application Credentials (Recommended)**

Since you have an "installed" application type, you might need to create a "web application" type for the client secret:

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Select Project**: `doctorsavailable`
3. **Navigate to**: APIs & Services → Credentials
4. **Click "Create Credentials"** → **OAuth 2.0 Client IDs**
5. **Application Type**: Web application
6. **Name**: DocAvailable Web Client
7. **Authorized Redirect URIs**:
   ```
   http://localhost:3000
   https://docavailable-3vbdv.ondigitalocean.app
   docavailable://
   ```
8. **Click Create**
9. **Copy the Client Secret** from the popup

### **Option 3: Use Existing Installed App (If No Secret Available)**

If your current OAuth client doesn't have a secret (common for installed apps), you can:

1. **Use the same Client ID** for both frontend and backend
2. **Set Client Secret to empty** in backend (some OAuth flows don't require it)
3. **Test the authentication** to see if it works without a secret

## 🔧 **Update Your Environment Files**

Once you have the client secret, update these files:

### **Frontend (.env)**:
```env
EXPO_PUBLIC_GOOGLE_CLIENT_ID=584940778531-fncqbp1secm3v81kbp2sfrqk1ullt7uq.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_CLIENT_SECRET=your-actual-client-secret-here
```

### **Backend (.env)**:
```env
GOOGLE_CLIENT_ID=584940778531-fncqbp1secm3v81kbp2sfrqk1ullt7uq.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-actual-client-secret-here
```

## 🧪 **Test Without Client Secret (Temporary)**

If you want to test immediately without getting the client secret:

1. **Update backend/.env** (create this file if it doesn't exist):
   ```env
   GOOGLE_CLIENT_ID=584940778531-fncqbp1secm3v81kbp2sfrqk1ullt7uq.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=
   ```

2. **Test the authentication**:
   ```bash
   cd backend
   php artisan serve --host=0.0.0.0 --port=8000
   ```

   ```bash
   npm start
   ```

## 🎯 **Expected Behavior**

- **Frontend**: Should show Google sign-in button
- **Backend**: Should accept the Google token
- **Database**: Should create/link user accounts

## 🚨 **Troubleshooting**

### **If Authentication Fails**:
1. **Check OAuth Consent Screen**: Make sure it's configured
2. **Check Authorized Domains**: Add your domains
3. **Check Redirect URIs**: Ensure they match your app

### **If No Client Secret Available**:
1. **Create Web Application** credentials in Google Cloud Console
2. **Use the new Client Secret** from the web application
3. **Keep the same Client ID** if possible

---

**Next Step**: Get your client secret from Google Cloud Console and update the environment files!
