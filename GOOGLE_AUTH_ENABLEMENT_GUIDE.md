# 🔐 Google Authentication Enablement Guide

## ✅ **Current Status**

Google OAuth authentication is **fully implemented** in your DocAvailable app but needs proper credentials to work. Here's what's already set up:

- ✅ **Frontend**: React Native with expo-auth-session
- ✅ **Backend**: Laravel controller with Google token verification
- ✅ **Database**: `google_id` field in users table
- ✅ **Configuration**: Environment variables added
- ✅ **Error Handling**: Comprehensive error management

## 🚨 **Required Action: Get Google OAuth Credentials**

### **Step 1: Google Cloud Console Setup**

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create/Select Project**: 
   - Create a new project or select existing one
   - Name it "DocAvailable" or similar
3. **Enable APIs**:
   - Go to **APIs & Services** → **Library**
   - Search for and enable:
     - **Google+ API**
     - **Google OAuth2 API**
     - **People API** (optional, for profile info)

### **Step 2: Create OAuth Credentials**

1. **Go to Credentials**:
   - Navigate to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth 2.0 Client IDs**

2. **Configure OAuth Client**:
   - **Application type**: Web application
   - **Name**: DocAvailable Web Client
   - **Authorized redirect URIs**:
     ```
     http://localhost:3000
     https://docavailable-3vbdv.ondigitalocean.app
     docavailable://
     ```

3. **Create Mobile App Credentials**:
   - Click **Create Credentials** → **OAuth 2.0 Client IDs** again
   - **Application type**: Mobile application
   - **Name**: DocAvailable Mobile App
   - **Package name**: `com.docavailable.app` (Android)
   - **Bundle ID**: `com.docavailable.minimal` (iOS)

### **Step 3: Configure OAuth Consent Screen**

1. **Go to OAuth Consent Screen**:
   - Navigate to **APIs & Services** → **OAuth consent screen**

2. **Configure App Information**:
   - **App name**: `DocAvailable`
   - **User support email**: Your email
   - **Developer contact information**: Your email
   - **App logo**: Upload your app logo (optional)

3. **Add Scopes**:
   - Click **Add or Remove Scopes**
   - Add these scopes:
     - `openid`
     - `profile`
     - `email`
     - `https://www.googleapis.com/auth/userinfo.email`
     - `https://www.googleapis.com/auth/userinfo.profile`

4. **Add Test Users** (for development):
   - Add your email and other test users
   - This allows testing before publishing

### **Step 4: Get Your Credentials**

After creating the OAuth clients, you'll get:

1. **Web Client**:
   - Client ID (for backend)
   - Client Secret (for backend)

2. **Mobile App Client**:
   - Client ID (for frontend)

### **Step 5: Update Environment Variables**

#### **Frontend (.env file)**:
```env
# Google OAuth Configuration
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-mobile-client-id-here
EXPO_PUBLIC_GOOGLE_CLIENT_SECRET=your-web-client-secret-here
```

#### **Backend (.env file)**:
```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-web-client-id-here
GOOGLE_CLIENT_SECRET=your-web-client-secret-here
```

## 🔧 **Testing the Setup**

### **1. Start Backend Server**
```bash
cd backend
php artisan serve --host=0.0.0.0 --port=8000
```

### **2. Start Frontend**
```bash
npm start
```

### **3. Test Google Sign-In**
- Go to login page
- Click "Continue with Google"
- Should open Google OAuth flow
- After successful authentication, user should be logged in

## 🎯 **Expected Behavior**

### **New Users**:
1. Click Google button → Google OAuth popup opens
2. User authorizes the app → Account created with basic info
3. User logged in as `patient` type
4. Redirected to patient dashboard

### **Existing Users**:
1. Click Google button → Google OAuth popup opens
2. User authorizes the app → Linked to existing account
3. User logged in with existing account type
4. Redirected to appropriate dashboard

## 🚨 **Troubleshooting**

### **Common Issues**:

1. **"Google OAuth Not Configured"**
   - Check `.env` file for `EXPO_PUBLIC_GOOGLE_CLIENT_ID`
   - Ensure credentials are properly set

2. **"Invalid Google Token"**
   - Check backend logs for token verification errors
   - Verify Google OAuth setup in Google Cloud Console

3. **"Network Error"**
   - Check internet connection
   - Verify backend server is running

4. **"Authorization Failed"**
   - Check OAuth consent screen configuration
   - Verify redirect URIs are correct

### **Debug Steps**:

1. **Check Environment Variables**:
   ```bash
   echo $EXPO_PUBLIC_GOOGLE_CLIENT_ID
   ```

2. **Check Backend Logs**:
   ```bash
   tail -f backend/storage/logs/laravel.log
   ```

3. **Test OAuth Flow**:
   - Use browser to test OAuth redirect
   - Check network tab for API calls

## 📝 **Security Considerations**

### **Production Setup**:

1. **Use Production OAuth Credentials**:
   - Create separate OAuth client for production
   - Use production bundle identifiers

2. **Secure Environment Variables**:
   - Use secure environment variable management
   - Never commit credentials to version control

3. **HTTPS Requirements**:
   - Ensure all API calls use HTTPS in production
   - Configure proper SSL certificates

4. **Token Validation**:
   - Backend validates Google user info
   - No sensitive data stored in tokens

## 🔄 **Next Steps**

1. **Get Google OAuth Credentials** (URGENT)
2. **Update `.env` files** with real credentials
3. **Test the implementation**
4. **Configure production settings** when deploying

---

**Status**: ⚠️ **WAITING FOR GOOGLE OAUTH CREDENTIALS** (Code is ready!)

## 📞 **Quick Setup Checklist**

- [ ] Create Google Cloud Project
- [ ] Enable required APIs
- [ ] Create OAuth 2.0 credentials (Web + Mobile)
- [ ] Configure OAuth consent screen
- [ ] Add authorized redirect URIs
- [ ] Get Client ID and Client Secret
- [ ] Update `.env` files with credentials
- [ ] Test Google sign-in functionality
- [ ] Verify user creation and login flow
