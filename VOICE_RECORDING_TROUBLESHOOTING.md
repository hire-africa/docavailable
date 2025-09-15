# Voice Recording Troubleshooting Guide

## Issue: 422 Status Code Error

The 422 error indicates a validation failure on the server side. Here's how to diagnose and fix the issue.

## 🔍 Diagnosis Steps

### 1. Check Backend Logs
Run the debug script to check backend configuration:
```bash
php scripts/debug_voice_upload.php
```

### 2. Check Frontend Logs
Run the frontend test script:
```bash
node scripts/test_voice_frontend.js
```

### 3. Monitor Network Requests
In your browser's developer tools or React Native debugger:
1. Go to Network tab
2. Try to upload a voice message
3. Look for the `/api/upload/voice-message` request
4. Check the request payload and response

## 🛠️ Common Fixes

### Fix 1: File Type Issues
**Problem**: The recorded file type doesn't match allowed MIME types.

**Solution**: Update the voice recording service to use the correct MIME type:
```typescript
formData.append('file', {
  uri: uri,
  type: 'audio/mp4', // Use audio/mp4 instead of audio/m4a
  name: fileName,
} as any);
```

### Fix 2: File Size Issues
**Problem**: The recorded file exceeds the 10MB limit.

**Solution**: Check the recording quality settings:
```typescript
// In voiceRecordingService.ts
await Audio.Recording.createAsync(
  Audio.RecordingOptionsPresets.HIGH_QUALITY, // Try LOW_QUALITY for smaller files
  (status) => {
    console.log('Recording status:', status);
  },
  100
);
```

### Fix 3: Authentication Issues
**Problem**: The request is missing or has an invalid authentication token.

**Solution**: Ensure the API service includes the auth token:
```typescript
// Check if apiService is properly configured with auth headers
const response = await apiService.post('/upload/voice-message', formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
    'Authorization': `Bearer ${token}`, // Ensure this is included
  },
});
```

### Fix 4: FormData Format Issues
**Problem**: The FormData is not properly formatted.

**Solution**: Ensure proper FormData structure:
```typescript
const formData = new FormData();
formData.append('file', {
  uri: uri,
  type: 'audio/mp4',
  name: `voice_${Date.now()}.m4a`,
} as any);
formData.append('appointment_id', appointmentId.toString());
```

### Fix 5: Backend Validation Issues
**Problem**: The backend validation rules are too strict.

**Solution**: Check the backend validation in `FileUploadController.php`:
```php
$request->validate([
    'file' => 'required|file|mimes:m4a,mp3,wav,aac,mp4|max:10240',
    'appointment_id' => 'required|integer'
]);
```

## 🔧 Advanced Debugging

### Step 1: Enable Detailed Logging
Add this to your voice recording service:
```typescript
console.log('📤 Uploading voice message:', {
  appointmentId,
  fileName,
  uri: uri.substring(0, 50) + '...',
  fileSize: await getFileSize(uri), // Add file size check
});
```

### Step 2: Check File Properties
Add a function to check file properties:
```typescript
const getFileInfo = async (uri: string) => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return {
      size: blob.size,
      type: blob.type,
    };
  } catch (error) {
    console.error('Error getting file info:', error);
    return null;
  }
};
```

### Step 3: Test with Different File Types
Try recording with different settings:
```typescript
// Try different recording options
await Audio.Recording.createAsync(
  {
    android: {
      extension: '.m4a',
      outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
      audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
      sampleRate: 44100,
      numberOfChannels: 1,
      bitRate: 128000,
    },
    ios: {
      extension: '.m4a',
      outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
      audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
      sampleRate: 44100,
      numberOfChannels: 1,
      bitRate: 128000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
  },
  (status) => {
    console.log('Recording status:', status);
  },
  100
);
```

## 📋 Checklist

- [ ] Backend route exists and is accessible
- [ ] Authentication token is valid and included
- [ ] File type is in allowed MIME types (m4a, mp3, wav, aac, mp4)
- [ ] File size is under 10MB
- [ ] FormData is properly formatted
- [ ] Backend validation rules are correct
- [ ] Storage directory has proper permissions
- [ ] Network connectivity is stable

## 🚨 Emergency Fixes

### If nothing else works:

1. **Temporarily disable file type validation**:
```php
// In FileUploadController.php
$request->validate([
    'file' => 'required|file|max:10240', // Remove mimes validation temporarily
    'appointment_id' => 'required|integer'
]);
```

2. **Use a different file format**:
```typescript
// Try recording as WAV instead of M4A
await Audio.Recording.createAsync(
  Audio.RecordingOptionsPresets.LOW_QUALITY, // This might use WAV
  (status) => {
    console.log('Recording status:', status);
  },
  100
);
```

3. **Check if the issue is with the specific device**:
- Test on different devices
- Test on different platforms (iOS vs Android)
- Test with different recording durations

## 📞 Getting Help

If the issue persists:

1. Run both debug scripts and share the output
2. Check the browser/device console for detailed error messages
3. Check the backend logs for validation errors
4. Test with a simple text message first to ensure the chat system works
5. Try uploading a small test audio file manually

## 🎯 Expected Behavior

When working correctly:
1. Tap microphone button → Recording starts
2. Speak message → Duration shows
3. Tap stop → Preview appears
4. Tap send → File uploads successfully
5. Voice message appears in chat with play button 