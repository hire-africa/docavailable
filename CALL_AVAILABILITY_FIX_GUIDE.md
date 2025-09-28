# Call Availability Fix Guide

## Problem Summary

The voice and video call functionality was failing with "Network request failed" errors when users tried to make calls. This was caused by:

1. **Missing API Endpoints**: The call services were trying to call `/api/call-sessions/check-availability` but this endpoint didn't exist in the backend
2. **Authentication Issues**: The call services were using placeholder tokens instead of real user authentication tokens
3. **Poor Error Handling**: Network errors weren't being handled gracefully

## What Was Fixed

### 1. Backend API Endpoints ✅

**Created `CallSessionController.php`** with the following endpoints:
- `POST /api/call-sessions/check-availability` - Check if user can make calls
- `POST /api/call-sessions/start` - Start a call session and deduct calls
- `POST /api/call-sessions/end` - End a call session
- `POST /api/call-sessions/deduction` - Process call deductions

**Added routes to `api.php`**:
```php
// Call session routes
Route::post('/call-sessions/check-availability', [App\Http\Controllers\CallSessionController::class, 'checkAvailability']);
Route::post('/call-sessions/start', [App\Http\Controllers\CallSessionController::class, 'start']);
Route::post('/call-sessions/end', [App\Http\Controllers\CallSessionController::class, 'end']);
Route::post('/call-sessions/deduction', [App\Http\Controllers\CallSessionController::class, 'deduction']);
```

### 2. Authentication Token Fix ✅

**Fixed `AudioCallService.ts` and `VideoCallService.ts`**:
- Replaced placeholder `'your-auth-token'` with real token retrieval
- Added proper AsyncStorage integration
- Added error handling for token retrieval

**Before:**
```typescript
private async getAuthToken(): Promise<string> {
  return 'your-auth-token'; // Placeholder
}
```

**After:**
```typescript
private async getAuthToken(): Promise<string> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const token = await AsyncStorage.getItem('auth_token');
    console.log('🔑 [AudioCallService] Retrieved auth token:', token ? 'Present' : 'Missing');
    return token || '';
  } catch (error) {
    console.error('❌ [AudioCallService] Failed to get auth token:', error);
    return '';
  }
}
```

### 3. Enhanced Error Handling ✅

**Improved error messages** for better user experience:
- Network errors now show "Network error. Please check your internet connection and try again."
- Added specific handling for "Network request failed" errors
- Better logging for debugging

## Deployment Required

⚠️ **IMPORTANT**: The backend changes need to be deployed to fix the call functionality.

### Files Changed:
1. `backend/app/Http/Controllers/CallSessionController.php` (NEW)
2. `backend/routes/api.php` (UPDATED)

### Deployment Steps:

1. **Upload the new controller**:
   ```bash
   # Upload CallSessionController.php to:
   # backend/app/Http/Controllers/CallSessionController.php
   ```

2. **Update the routes file**:
   ```bash
   # Update backend/routes/api.php with the new call-sessions routes
   ```

3. **Clear Laravel cache** (if needed):
   ```bash
   php artisan route:clear
   php artisan config:clear
   php artisan cache:clear
   ```

4. **Test the endpoints**:
   ```bash
   node test-call-availability.js
   ```

## Testing

### Manual Testing:
1. Try to make a voice call - should now check availability properly
2. Try to make a video call - should now check availability properly
3. Check console logs for proper authentication token retrieval

### API Testing:
Run the test script to verify endpoints are working:
```bash
node test-call-availability.js
```

Expected results after deployment:
- ✅ All endpoints should return 401 (Unauthorized) without valid auth
- ✅ Request validation should return 400 (Bad Request) for invalid data
- ❌ 404 errors indicate endpoints are not deployed yet

## Expected Behavior After Fix

### Before Fix:
```
ERROR ❌ Error checking call availability: [TypeError: Network request failed]
ERROR ❌ Call error: Failed to check call availability
```

### After Fix:
```
LOG 🔑 [AudioCallService] Retrieved auth token: Present
LOG ✅ Voice call availability confirmed: 5 calls remaining
LOG 📞 Starting voice call...
```

## Files Modified

### Backend:
- `backend/app/Http/Controllers/CallSessionController.php` (NEW)
- `backend/routes/api.php` (UPDATED)

### Frontend:
- `services/audioCallService.ts` (UPDATED)
- `services/videoCallService.ts` (UPDATED)

### Testing:
- `test-call-availability.js` (NEW)

## Next Steps

1. **Deploy backend changes** to production
2. **Test call functionality** in the app
3. **Monitor logs** for any remaining issues
4. **Remove test file** (`test-call-availability.js`) after verification

## Troubleshooting

If calls still fail after deployment:

1. **Check authentication**: Ensure user is logged in and token is valid
2. **Check subscription**: Verify user has remaining calls in their subscription
3. **Check network**: Ensure stable internet connection
4. **Check logs**: Look for specific error messages in console

The fix addresses the root cause of the "Network request failed" errors and provides proper call availability checking for both voice and video calls.
