# 🚀 Quick Google OAuth Setup Guide

## ✅ **Current Status**
- ✅ expo-auth-session installed
- ✅ Backend Google login endpoint ready
- ✅ Frontend Google OAuth implementation complete
- ⚠️ **NEEDS GOOGLE CREDENTIALS**

## 🔥 **URGENT: Get Google OAuth Credentials**

### Step 1: Google Cloud Console Setup
1. **Go to**: https://console.cloud.google.com/
2. **Create/Select Project**: Create new or select existing
3. **Enable APIs**:
   - Go to **APIs & Services** → **Library**
   - Search and enable: **Google+ API** and **Google OAuth2 API**

### Step 2: Create OAuth Credentials
1. **Go to**: **APIs & Services** → **Credentials**
2. **Click**: **Create Credentials** → **OAuth 2.0 Client IDs**
3. **Choose**: **Mobile application**
4. **Add Bundle IDs**:
   - iOS: `com.docavailable.minimal`
   - Android: `com.docavailable.app`
5. **Copy**: Client ID and Client Secret

### Step 3: Configure Environment
Update your `.env` file:
```env
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-actual-client-id-here
EXPO_PUBLIC_GOOGLE_CLIENT_SECRET=your-actual-client-secret-here
```

### Step 4: OAuth Consent Screen
1. **Go to**: **APIs & Services** → **OAuth consent screen**
2. **Configure**:
   - App name: `DocAvailable`
   - User support email: Your email
   - Developer contact: Your email
3. **Add Scopes**: `openid`, `profile`, `email`
4. **Add Test Users**: Your email (for development)

## 🧪 **Test the Setup**

### Option 1: Use Test Component
1. Import `GoogleAuthTest` in your app
2. Run the app and test configuration

### Option 2: Test Login Page
1. Start backend: `cd backend && php artisan serve --host=0.0.0.0 --port=8000`
2. Start frontend: `npm start`
3. Go to login page and click "Continue with Google"

## 🎯 **Expected Flow**

### New Users:
1. Click Google button → Google OAuth popup
2. User authorizes → Account created (patient type)
3. User logged in → Redirected to patient dashboard

### Existing Users:
1. Click Google button → Google OAuth popup
2. User authorizes → Linked to existing account
3. User logged in → Redirected to appropriate dashboard

## 🚨 **Common Issues**

### "Google OAuth Not Configured"
- Check `.env` file has real credentials
- Restart development server after changing `.env`

### "Invalid Google Token"
- Check backend logs: `tail -f backend/storage/logs/laravel.log`
- Verify Google OAuth setup in console

### "Network Error"
- Check internet connection
- Verify backend server is running

## 📝 **Next Steps**

1. **Get Google OAuth Credentials** (URGENT)
2. **Update `.env` file** with real credentials
3. **Test the implementation**
4. **Deploy with production credentials**

---

**Status**: ⚠️ **WAITING FOR GOOGLE CREDENTIALS** (Code is ready!) 