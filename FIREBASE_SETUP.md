# Firebase Setup Guide for DocAvailable

## 🚨 Current Issue: "Component auth has not been registered yet"

This error occurs because Firebase is not properly configured. The app is currently using placeholder values in the Firebase configuration.

## 📦 Installed Packages

The following packages have been installed:

### Navigation
- `@react-navigation/stack` - Stack navigation
- `@react-navigation/drawer` - Drawer navigation
- `react-native-vector-icons` - Additional icons

### Firebase
- `firebase` - Main Firebase SDK

## 🔥 Firebase Configuration

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter your project name (e.g., "doc-available")
4. Follow the setup wizard

### 2. Enable Authentication

1. In Firebase Console, go to "Authentication"
2. Click "Get started"
3. Enable "Email/Password" authentication
4. Add any additional providers you need (Google, Apple, etc.)

### 3. Enable Firestore Database

1. Go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" for development
4. Select a location close to your users

### 4. Enable Storage

1. Go to "Storage"
2. Click "Get started"
3. Choose "Start in test mode" for development
4. Select the same location as Firestore

### 5. Get Your Configuration

1. Go to Project Settings (gear icon)
2. Scroll down to "Your apps"
3. Click the web app icon (</>)
4. Register your app with a nickname
5. Copy the configuration object

### 6. Update Firebase Config

**IMPORTANT**: Replace the placeholder values in `config/firebase.ts`:

```typescript
const firebaseConfig = {
  apiKey: "your-actual-api-key-here",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-actual-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id"
};
```

**Replace these values with your actual Firebase project credentials.**

## 🏗️ Project Structure

```
├── config/
│   └── firebase.ts          # Firebase configuration
├── contexts/
│   └── AuthContext.tsx      # Authentication context
├── services/
│   ├── authService.ts       # Authentication operations
│   ├── firestoreService.ts  # Database operations
│   └── storageService.ts    # File storage operations
```

## 🔐 Authentication Features

### Available Functions
- User registration (patient/doctor)
- User login/logout
- Profile management
- Authentication state management

### Usage Example
```typescript
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';

// In your component
const { user, userData, loading, isFirebaseConfigured } = useAuth();

// Sign up
await authService.signUp(email, password, {
  userType: 'patient',
  firstName: 'John',
  lastName: 'Doe'
});

// Sign in
await authService.signIn(email, password);

// Sign out
await authService.signOut();
```

## 📊 Database Features

### Collections
- `users` - User profiles and data
- `appointments` - Appointment records

### Available Functions
- Create/read/update/delete users
- Manage doctor profiles
- Handle appointments
- Query data with filters

## 📁 Storage Features

### Available Functions
- Upload profile images
- Upload doctor documents
- File management
- Get download URLs

## 🚀 Next Steps

1. **Configure Firebase**: Update the config with your actual Firebase project details
2. **Set up Security Rules**: Configure Firestore and Storage security rules
3. **Test Authentication**: Test sign up/login flows
4. **Add Error Handling**: Implement proper error handling and user feedback
5. **Add Loading States**: Show loading indicators during async operations

## 🔒 Security Rules

### Firestore Rules (Basic)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to all users under any document
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Storage Rules (Basic)
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Users can upload their own profile images
    match /users/{userId}/profile.jpg {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Doctors can upload documents
    match /doctors/{doctorId}/documents/{documentId} {
      allow read, write: if request.auth != null && request.auth.uid == doctorId;
    }
  }
}
```

## Firestore Security Rules

The "no internet connection" error is likely caused by restrictive Firestore security rules. To fix this, update your Firestore security rules in the Firebase Console:

1. Go to Firebase Console > Firestore Database > Rules
2. Replace the current rules with these permissive rules for testing:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to all users under any document
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Click "Publish" to save the rules

## Alternative Rules (More Secure)

For production, use these more secure rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read and write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can read other users' basic info (for doctor/patient matching)
    match /users/{userId} {
      allow read: if request.auth != null;
    }
    
    // Appointments - users can read/write their own appointments
    match /appointments/{appointmentId} {
      allow read, write: if request.auth != null && 
        (resource.data.patientId == request.auth.uid || 
         resource.data.doctorId == request.auth.uid);
    }
  }
}
```

## Testing Connection

After updating the rules, test the connection by:

1. Creating a new doctor account
2. Checking the browser console for detailed error messages
3. Verifying that user data is stored in Firestore

## Common Issues

1. **Permission Denied**: Check Firestore security rules
2. **Service Unavailable**: Check network connection
3. **Unauthenticated**: User not properly authenticated
4. **Database Not Initialized**: Firebase configuration issue

## 🛠️ Troubleshooting

### "Component auth has not been registered yet" Error
This error occurs when:
1. Firebase configuration is not properly set up
2. Placeholder values are still in the config file
3. Firebase project credentials are incorrect

**Solution**: Update `config/firebase.ts` with your actual Firebase project credentials.

### Authentication Not Working
- Check that Email/Password authentication is enabled in Firebase Console
- Verify your API key and project ID are correct
- Check the browser console for any Firebase initialization errors

### Database Access Issues
- Ensure Firestore is created and in test mode
- Check that your security rules allow the operations you're trying to perform
- Verify the collection names match what's expected in the code 

## ⚠️ IMPORTANT: Firestore Security Rules Setup

**The "no internet connection" error is most likely caused by missing or overly restrictive Firestore security rules.**

### Current Issue
If you haven't set up Firestore security rules, Firebase blocks all access by default, which causes the "unable to load profile information" error.

### How to Fix

1. **Go to Firebase Console**:
   - Open [Firebase Console](https://console.firebase.google.com/)
   - Select your project: `doc-available-301df`
   - Navigate to **Firestore Database** > **Rules**

2. **Set Up Basic Rules** (for development/testing):
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Allow read/write access to all authenticated users
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

3. **Click "Publish"** to save the rules

4. **Test the Fix**:
   - Try creating a new doctor account
   - The profile data should now load properly
   - No more "unable to load profile information" errors

### Production Rules (More Secure)

For production, use these more secure rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read and write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can read other users' basic info (for doctor/patient matching)
    match /users/{userId} {
      allow read: if request.auth != null;
    }
    
    // Appointments - users can read/write their own appointments
    match /appointments/{appointmentId} {
      allow read, write: if request.auth != null && 
        (resource.data.patientId == request.auth.uid || 
         resource.data.doctorId == request.auth.uid);
    }
  }
}
```

### Verification Steps

After updating the rules:

1. **Check Firebase Console**:
   - Go to Firestore Database > Data
   - You should see a `users` collection
   - User documents should be created when signing up

2. **Test User Creation**:
   - Create a new doctor account
   - Check that user data appears in Firestore
   - Verify routing to doctor dashboard works

3. **Check Console Logs**:
   - Open browser developer tools
   - Look for successful Firestore operations
   - No more permission denied errors

### Common Issues

1. **"Permission denied"**: Rules are too restrictive
2. **"Service unavailable"**: Network connectivity issue
3. **"Unauthenticated"**: User not properly authenticated
4. **No rules set**: Firebase blocks all access by default

### Quick Test

If you want to test immediately, you can temporarily allow all access (NOT for production):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**⚠️ Warning**: Only use the permissive rules for testing. Always use proper security rules for production. 