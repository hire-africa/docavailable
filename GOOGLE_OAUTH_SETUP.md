# 🔐 Google OAuth Setup Guide for DocAvailable

## ✅ **Implementation Status**

The Google OAuth integration has been implemented with the following components:

- ✅ **Frontend**: expo-auth-session integration
- ✅ **Backend**: JWT-based Google authentication
- ✅ **Configuration**: Centralized OAuth settings
- ✅ **Error Handling**: Comprehensive error management
- ✅ **Database**: `google_id` field support

## 🚨 **Required Setup Steps**

### 1. **Google Cloud Console Setup**

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create/Select Project**: Create a new project or select existing one
3. **Enable APIs**:
   - Go to **APIs & Services** → **Library**
   - Search for and enable:
     - **Google+ API**
     - **Google OAuth2 API**
4. **Create OAuth Credentials**:
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth 2.0 Client IDs**
   - Choose **Mobile application**
   - Add your app's bundle identifier:
     - iOS: `com.docavailable.minimal`
     - Android: `com.docavailable.app`
5. **Get Credentials**:
   - Copy the **Client ID** and **Client Secret**

### 2. **Environment Configuration**

Update your `.env` file with your Google credentials:

```env
# Google OAuth Configuration
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-actual-google-client-id
EXPO_PUBLIC_GOOGLE_CLIENT_SECRET=your-actual-google-client-secret
```

### 3. **OAuth Consent Screen Setup**

1. **Go to OAuth Consent Screen**:
   - Navigate to **APIs & Services** → **OAuth consent screen**
2. **Configure App Information**:
   - App name: `DocAvailable`
   - User support email: Your email
   - Developer contact information: Your email
3. **Add Scopes**:
   - `openid`
   - `profile`
   - `email`
4. **Add Test Users** (for development):
   - Add your email and other test users

### 4. **Authorized Redirect URIs**

Add these redirect URIs in your Google OAuth client:

```
docavailable://
```

## 🔧 **Testing the Implementation**

### 1. **Start Backend Server**
```bash
cd backend
php artisan serve --host=0.0.0.0 --port=8000
```

### 2. **Start Frontend**
```bash
npm start
```

### 3. **Test Google Sign-In**
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

### **Error Scenarios**:
- **Account Suspended**: Clear error message with support contact
- **Account Pending**: Clear error message for doctor approval
- **Network Issues**: Helpful error messages with suggestions
- **Configuration Issues**: Clear guidance on setup requirements

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
2. **Update `.env` file** with real credentials
3. **Test the implementation**
4. **Configure production settings** when deploying

---

**Status**: ⚠️ **WAITING FOR GOOGLE OAUTH CREDENTIALS** (Code is ready!) 