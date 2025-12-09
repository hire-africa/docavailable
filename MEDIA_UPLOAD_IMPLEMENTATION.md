# Media Upload Queue Implementation

## 🎯 Overview

This implementation provides a robust, WhatsApp-like media upload system for images and voice notes in your chat application. It uses async storage for offline support, automatic retry logic, and real-time progress tracking.

## 🚀 Quick Start

### 1. Initialize the System

Add this to your app's initialization (e.g., in your main App.tsx or chat service initialization):

```typescript
import { initializeMediaUpload } from './services/mediaUploadInitializer';

// Initialize on app start
useEffect(() => {
  initializeMediaUpload();
}, []);
```

### 2. Use the Enhanced Chat Input

Replace your existing chat input with the new `ChatInputWithMedia` component:

```typescript
import { ChatInputWithMedia } from './components/ChatInputWithMedia';

// In your chat component
<ChatInputWithMedia
  appointmentId={appointmentId}
  onSendMessage={handleSendMessage}
  onImageUploaded={handleImageUploaded}
  onVoiceUploaded={handleVoiceUploaded}
  placeholder="Type a message..."
  disabled={isLoading}
/>
```

### 3. Handle Upload Events

```typescript
const handleImageUploaded = (tempId: string) => {
  console.log('Image uploaded with temp ID:', tempId);
  // The temporary message is already added to your messages list
  // Progress updates are handled automatically
};

const handleVoiceUploaded = (tempId: string) => {
  console.log('Voice uploaded with temp ID:', tempId);
  // The temporary message is already added to your messages list
  // Progress updates are handled automatically
};
```

## 🔧 Advanced Usage

### Using the Hook Directly

If you need more control, use the `useMediaUpload` hook directly:

```typescript
import { useMediaUpload } from './hooks/useMediaUpload';

const {
  pickAndUploadImage,
  takePhotoAndUpload,
  startVoiceRecording,
  stopVoiceRecordingAndUpload,
  imageUploadState,
  voiceUploadState,
  voiceRecordingState,
} = useMediaUpload();

// Pick and upload image
const handlePickImage = async () => {
  const result = await pickAndUploadImage(appointmentId);
  if (result.success) {
    console.log('Image upload started:', result.tempId);
  }
};

// Start voice recording
const handleStartRecording = async () => {
  const success = await startVoiceRecording();
  if (success) {
    console.log('Recording started');
  }
};

// Stop recording and upload
const handleStopRecording = async () => {
  const result = await stopVoiceRecordingAndUpload(appointmentId);
  if (result.success) {
    console.log('Voice upload started:', result.tempId);
  }
};
```

### Custom UI Components

You can also use the individual services directly:

```typescript
import { enhancedImageService } from './services/enhancedImageService';
import { enhancedVoiceService } from './services/enhancedVoiceService';

// Pick image from gallery
const result = await enhancedImageService.pickAndQueueImage(appointmentId);

// Take photo with camera
const result = await enhancedImageService.takePhotoAndQueue(appointmentId);

// Start voice recording
await enhancedVoiceService.startRecording();

// Stop recording and upload
const result = await enhancedVoiceService.stopRecordingAndQueue(appointmentId);
```

## 📱 Features

### ✅ What's Included

- **Offline Support**: Uploads are queued and processed when network is available
- **Automatic Retry**: Failed uploads retry up to 3 times with exponential backoff
- **Progress Tracking**: Real-time upload progress with percentage and status
- **Error Handling**: Clear error messages and retry options
- **Token Management**: Automatic authentication token refresh
- **Queue Management**: Persistent queue survives app restarts
- **Immediate UI Feedback**: Messages appear instantly while uploads happen in background
- **Multiple Upload Types**: Support for both images and voice messages
- **Camera Integration**: Take photos directly or pick from gallery
- **Voice Recording**: Built-in voice recording with duration display

### 🎨 UI Components

- `MediaUploadHandler`: Core media upload buttons and progress indicators
- `ChatInputWithMedia`: Complete chat input with media upload integration
- `useMediaUpload`: React hook for managing upload state and functions

## 🔄 How It Works

### 1. Upload Flow

1. User selects image or starts voice recording
2. Temporary message is created and shown immediately
3. File is added to upload queue
4. Queue processes uploads in background
5. Progress updates are shown in real-time
6. On completion, temporary message is replaced with real message
7. On failure, retry options are provided

### 2. Queue Management

- Uploads are stored in AsyncStorage for persistence
- Queue processes uploads sequentially to avoid overwhelming the server
- Failed uploads are retried automatically with exponential backoff
- Completed uploads are cleaned up automatically

### 3. Error Recovery

- Authentication errors trigger token refresh and retry
- Network errors are handled gracefully with retry options
- File format errors show clear messages to users
- Upload size limits are enforced with helpful error messages

## 🛠️ Configuration

### Upload Limits

The system respects your existing server-side limits:
- Images: 4MB max (configurable in backend)
- Voice messages: 10MB max (configurable in backend)

### Retry Settings

```typescript
// In mediaUploadQueueService.ts
private maxRetries = 3; // Maximum retry attempts
private retryDelay = 2000; // Base delay between retries (exponential backoff)
```

### Queue Cleanup

```typescript
// Clean up completed uploads
await mediaUploadQueueService.cleanupCompletedUploads();

// Get queue statistics
const stats = await mediaUploadQueueService.getQueueStats();
```

## 🐛 Troubleshooting

### Common Issues

1. **Uploads not starting**: Check if the queue service is initialized
2. **Authentication errors**: Ensure your API service handles token refresh
3. **File format errors**: Check MIME types and file extensions
4. **Network errors**: The system will retry automatically

### Debug Information

Enable debug logging by checking the console for messages prefixed with:
- `[MediaQueue]` - Queue processing
- `[EnhancedImage]` - Image upload operations
- `[EnhancedVoice]` - Voice recording and upload
- `[WebRTCChat]` - Chat service integration

### Monitoring Uploads

```typescript
// Get current upload statistics
const stats = await getMediaUploadStats();
console.log('Upload stats:', stats);

// Monitor specific upload progress
enhancedImageService.subscribeToImageProgress(tempId, (progress) => {
  console.log('Upload progress:', progress);
});
```

## 🔒 Security

- All uploads go through your existing authentication system
- Files are validated on both client and server side
- Temporary messages are cleaned up after completion
- No sensitive data is stored in the upload queue

## 📈 Performance

- Uploads happen in background without blocking UI
- Queue processing is optimized for mobile performance
- AsyncStorage operations are batched for efficiency
- Memory usage is minimized with automatic cleanup

## 🚀 Next Steps

1. **Test the implementation** with various network conditions
2. **Customize the UI** to match your app's design
3. **Add more media types** (videos, documents) if needed
4. **Implement push notifications** for upload completion
5. **Add upload analytics** for monitoring usage

## 📞 Support

If you encounter any issues:

1. Check the console logs for error messages
2. Verify your API endpoints are working
3. Test with different file sizes and types
4. Check network connectivity and authentication

The system is designed to be robust and handle most edge cases automatically, but feel free to customize it for your specific needs!
