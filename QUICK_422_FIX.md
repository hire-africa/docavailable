# Quick Fix for 422 Voice Message Upload Error

## 🚨 Immediate Steps to Fix 422 Error

### Step 1: Run the Simple Tests
```bash
# Test backend configuration
php scripts/simple_voice_test.php

# Test frontend configuration  
node scripts/simple_voice_frontend_test.js
```

### Step 2: Check the Most Common Issues

#### Issue 1: File Type Mismatch
**Problem**: The recorded file type doesn't match what the server expects.

**Quick Fix**: Update the MIME type in `services/voiceRecordingService.ts`:
```typescript
formData.append('file', {
  uri: uri,
  type: 'audio/mp4', // Make sure this is audio/mp4
  name: fileName,
} as any);
```

#### Issue 2: Missing Authentication
**Problem**: The request doesn't include the authentication token.

**Quick Fix**: Check if `apiService` includes auth headers automatically. If not, add:
```typescript
const response = await apiService.post('/upload/voice-message', formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
    // Make sure Authorization header is included
  },
});
```

#### Issue 3: File Size Too Large
**Problem**: The recorded file exceeds 10MB.

**Quick Fix**: Try lower quality recording:
```typescript
await Audio.Recording.createAsync(
  Audio.RecordingOptionsPresets.LOW_QUALITY, // Use LOW_QUALITY instead of HIGH_QUALITY
  (status) => {
    console.log('Recording status:', status);
  },
  100
);
```

#### Issue 4: Missing Required Fields
**Problem**: The `appointment_id` field is missing or invalid.

**Quick Fix**: Ensure the appointment ID is being sent:
```typescript
formData.append('appointment_id', appointmentId.toString());
console.log('📤 Appointment ID:', appointmentId); // Add this for debugging
```

### Step 3: Emergency Fixes

#### Emergency Fix 1: Temporarily Disable File Type Validation
In `backend/app/Http/Controllers/FileUploadController.php`, temporarily change:
```php
$request->validate([
    'file' => 'required|file|max:10240', // Remove mimes validation
    'appointment_id' => 'required|integer'
]);
```

#### Emergency Fix 2: Use Different File Format
Try recording as WAV instead of M4A:
```typescript
await Audio.Recording.createAsync(
  {
    android: {
      extension: '.wav',
      outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_PCM_16BIT,
      audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_PCM_16BIT,
      sampleRate: 44100,
      numberOfChannels: 1,
      bitRate: 128000,
    },
    ios: {
      extension: '.wav',
      outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_LINEARPCM,
      audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
      sampleRate: 44100,
      numberOfChannels: 1,
      bitRate: 128000,
    },
  },
  (status) => {
    console.log('Recording status:', status);
  },
  100
);
```

### Step 4: Debug the Actual Error

#### Add Detailed Logging
In `services/voiceRecordingService.ts`, add this before the upload:
```typescript
console.log('📤 Uploading voice message:', {
  appointmentId,
  fileName,
  uri: uri.substring(0, 50) + '...',
  fileExists: await checkFileExists(uri),
});

const checkFileExists = async (uri: string) => {
  try {
    const response = await fetch(uri);
    return response.ok;
  } catch {
    return false;
  }
};
```

#### Check Backend Logs
Look in `backend/storage/logs/laravel.log` for validation errors:
```bash
tail -f backend/storage/logs/laravel.log
```

### Step 5: Test the Fix

1. **Start your app**
2. **Navigate to a chat**
3. **Try recording a short voice message (2-3 seconds)**
4. **Check the console for detailed error messages**
5. **Check the backend logs for validation errors**

### Step 6: If Still Failing

#### Check Network Tab
1. Open browser dev tools
2. Go to Network tab
3. Try uploading a voice message
4. Look for the `/api/upload/voice-message` request
5. Check the request payload and response

#### Common Response Patterns
- **422 with validation errors**: Check file type, size, or missing fields
- **401 Unauthorized**: Authentication issue
- **500 Server Error**: Backend processing issue
- **Network Error**: Connectivity issue

### 🎯 Expected Success Flow
1. Tap microphone → Recording starts
2. Speak message → Duration shows
3. Tap stop → Preview appears
4. Tap send → File uploads successfully
5. Voice message appears in chat with play button

### 📞 If Nothing Works
1. Try recording on a different device
2. Try recording with a different duration
3. Check if the issue is specific to certain file types
4. Verify the backend server is running and accessible
5. Check if the issue is with the specific chat session

## 🔧 Quick Test Commands

```bash
# Test backend
php scripts/simple_voice_test.php

# Test frontend
node scripts/simple_voice_frontend_test.js

# Check logs
tail -f backend/storage/logs/laravel.log

# Check if server is running
curl -X POST http://localhost:8000/api/upload/voice-message
``` 