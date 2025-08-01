# Complete Migration Guide: Firebase → Laravel Backend

## Overview

This guide will help you completely migrate from Firebase to Laravel backend while keeping Firebase Auth for authentication.

## Current State Analysis

From your logs, I can see you're currently using:
- ✅ **Firebase Auth** - User authentication
- ❌ **Firebase Firestore** - Database (needs migration)
- ❌ **Firebase Realtime Database** - Real-time features (needs migration)
- ❌ **Firebase Storage** - File storage (can keep or migrate)

## Migration Strategy

### Phase 1: Data Migration (Backend)

1. **Install Firebase Admin SDK in Laravel**
   ```bash
   cd backend
   composer require kreait/laravel-firebase
   ```

2. **Configure Firebase Admin SDK**
   ```bash
   # Download Firebase service account key
   # Place it in backend/storage/app/firebase/
   # Update .env with Firebase project ID
   ```

3. **Run Data Migration**
   ```bash
   # Test migration (dry run)
   php artisan firebase:migrate-data --dry-run
   
   # Actual migration
   php artisan firebase:migrate-data
   ```

### Phase 2: Frontend Service Updates

1. **Replace Firebase Services**
   - Replace `firestoreService.ts` with `laravelService.ts`
   - Update `authService.ts` to use Laravel backend
   - Keep Firebase Auth for authentication only

2. **Update Components**
   - Update all components to use Laravel services
   - Remove Firebase imports where not needed
   - Update real-time listeners to use WebSockets

### Phase 3: Real-time Features

1. **WebSocket Setup**
   - Alternative real-time solution (to be determined)
   - Replace Firebase real-time listeners

2. **File Storage**
   - Keep Firebase Storage or migrate to Laravel Storage
   - Update file upload endpoints

## Step-by-Step Migration

### Step 1: Backend Setup

1. **Add Firebase Admin SDK to Laravel**
   ```bash
   cd backend
   composer require kreait/laravel-firebase
   ```

2. **Create Firebase configuration**
   ```php
   // config/firebase.php
   return [
       'project_id' => env('FIREBASE_PROJECT_ID'),
       'credentials' => storage_path('app/firebase/service-account.json'),
   ];
   ```

3. **Add environment variables**
   ```bash
   # backend/.env
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CREDENTIALS_PATH=storage/app/firebase/service-account.json
   ```

### Step 2: Data Migration

1. **Run the migration command**
   ```bash
   php artisan firebase:migrate-data --dry-run
   ```

2. **Review the output and fix any issues**

3. **Run actual migration**
   ```bash
   php artisan firebase:migrate-data
   ```

### Step 3: Frontend Updates

1. **Update AuthContext**
   ```typescript
   // contexts/AuthContext.tsx
   import { authService } from '../services/authService';
   // Replace firestoreService with laravelService
   ```

2. **Update Components**
   ```typescript
   // Replace all firestoreService calls with laravelService
   // Example:
   // Before: firestoreService.getAppointmentsByUser(userId, userType)
   // After: laravelService.getAppointments(userType)
   ```

3. **Update Real-time Features**
   ```typescript
   // Replace Firebase listeners with WebSocket connections
   // Example:
   // Before: onSnapshot(collection(db, 'messages'), callback)
   // After: laravelService.subscribeToChatRoom(roomId, callback)
   ```

### Step 4: Testing

1. **Test Authentication**
   - Login/logout functionality
   - User registration
   - Password reset

2. **Test Data Operations**
   - Create/read/update/delete appointments
   - Chat functionality
   - Wallet operations
   - Notifications

3. **Test Real-time Features**
   - Live chat messages
   - Typing indicators
   - Online status

## Migration Checklist

### Backend Tasks
- [ ] Install Firebase Admin SDK
- [ ] Configure Firebase credentials
- [ ] Create migration command
- [ ] Test data migration
- [ ] Run full migration
- [ ] Verify data integrity
- [ ] Set up WebSocket server
- [ ] Configure file storage

### Frontend Tasks
- [ ] Update auth service
- [ ] Replace firestore service
- [ ] Update all components
- [ ] Test authentication flow
- [ ] Test data operations
- [ ] Test real-time features
- [ ] Remove Firebase dependencies
- [ ] Update environment variables

### Testing Tasks
- [ ] Test user registration
- [ ] Test user login
- [ ] Test appointment creation
- [ ] Test chat functionality
- [ ] Test wallet operations
- [ ] Test notifications
- [ ] Test file uploads
- [ ] Test real-time features

## Environment Variables

### Backend (.env)
```bash
# Firebase (for migration and auth)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CREDENTIALS_PATH=storage/app/firebase/service-account.json

# Database
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=doc_available
DB_USERNAME=root
DB_PASSWORD=

# WebSocket
# Removed Pusher configuration - will use alternative solution
BROADCAST_DRIVER=log
```

### Frontend (.env)
```bash
# Laravel Backend
EXPO_PUBLIC_API_BASE_URL=http://172.20.10.11:8000/api
EXPO_PUBLIC_BACKEND_ENABLED=true

# Firebase (only for auth)
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id

# WebSocket
# Removed Pusher configuration - will use alternative solution
```

## Post-Migration Cleanup

1. **Remove Firebase Dependencies**
   ```bash
   # Frontend
   npm uninstall firebase firebase-admin firebase-functions
   
   # Backend
   composer remove kreait/laravel-firebase
   ```

2. **Update Documentation**
   - Remove Firebase references
   - Update API documentation
   - Update deployment guides

3. **Performance Optimization**
   - Add database indexes
   - Implement caching
   - Optimize queries

## Rollback Plan

If migration fails:

1. **Keep Firebase services as backup**
2. **Use feature flags to switch back**
3. **Restore from database backup**
4. **Fix issues and retry migration**

## Benefits After Migration

- **Better Performance**: Laravel's optimized queries
- **More Control**: Full control over data and logic
- **Scalability**: Better horizontal scaling
- **Cost Savings**: No Firebase usage costs
- **Custom Features**: Easy to add new features
- **Better Testing**: Full test coverage possible

## Support

If you encounter issues during migration:

1. Check the Laravel logs: `tail -f storage/logs/laravel.log`
2. Check the migration command output
3. Verify database connections
4. Test API endpoints individually
5. Check WebSocket connections

## Next Steps

1. **Start with data migration**
2. **Test thoroughly in development**
3. **Deploy to staging environment**
4. **Monitor performance and errors**
5. **Gradually roll out to production**
6. **Remove Firebase dependencies**

This migration will give you full control over your backend while maintaining the same user experience. 