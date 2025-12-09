# Message Duplication Fixes

## Problem Summary
The messaging system was experiencing duplicate text messages, with the web version sending up to 4 texts instead of 1. Additionally, voice messages were being blocked after the first one due to overly restrictive rate limiting. These issues were caused by multiple problems in the synchronization and message handling logic.

## Root Causes Identified

### 1. **Fast Sync Intervals**
- Sync interval was set to 3 seconds, causing rapid polling
- Multiple sync operations running simultaneously
- No cooldown between message sends and syncs

### 2. **Callback Debouncing Issues**
- Callback debounce time was only 100ms
- Multiple UI updates triggered rapidly
- No proper state management for sending messages

### 3. **Backend Duplicate Detection**
- No duplicate message detection on server side
- No rate limiting for message sends
- Messages with same content could be stored multiple times

### 4. **Frontend State Management**
- No proper handling of sending state
- Multiple API calls could be triggered
- No prevention of rapid message sends

### 5. **Voice Message Issues**
- Same rate limiting applied to all message types
- Voice recording state not properly reset
- Duplicate detection too aggressive for voice messages
- **Voice messages not following same flow pattern as text messages** (critical fix)

## Fixes Implemented

### Frontend Fixes (messageStorageService.ts)

#### 1. **Increased Sync Interval**
```typescript
// Before: 3 seconds
private readonly SYNC_INTERVAL = 3000;

// After: 10 seconds
private readonly SYNC_INTERVAL = 10000;
```

#### 2. **Improved Callback Debouncing**
```typescript
// Before: 100ms
private readonly CALLBACK_DEBOUNCE_MS = 100;

// After: 500ms
private readonly CALLBACK_DEBOUNCE_MS = 500;
```

#### 3. **Added Sync Skip Logic**
```typescript
// Skip sync if a message was sent recently (within 5 seconds)
const lastSent = this.lastMessageSent.get(appointmentId) || 0;
const timeSinceLastSent = Date.now() - lastSent;

if (timeSinceLastSent < 5000) {
  console.log(`⏭️ Skipping sync - message sent recently`);
  return;
}
```

#### 4. **Removed Duplicate Callbacks**
```typescript
// Removed the second callback notification in sendMessage
// Now only notify once when message is sent, let auto-sync handle updates
```

#### 5. **Message Type-Specific Message Merging**
```typescript
// Added content-based duplicate detection with different time windows
// Check for same sender, same message, within different time windows
if (m.sender_id === serverMessage.sender_id && 
    m.message === serverMessage.message &&
    m.message_type === serverMessage.message_type) {
  
  const localTime = new Date(m.created_at).getTime();
  const serverTime = new Date(serverMessage.created_at).getTime();
  const timeDiff = Math.abs(localTime - serverTime);
  
  // Different time windows for different message types
  let timeWindow = 30000; // Default 30 seconds for text messages
  if (serverMessage.message_type === 'voice') {
    timeWindow = 60000; // 60 seconds for voice messages
  } else if (serverMessage.message_type === 'image') {
    timeWindow = 45000; // 45 seconds for image messages
  }
  
  // If messages are within the time window, consider them duplicates
  return timeDiff < timeWindow;
}
```

#### 6. **Voice Message Flow Pattern Fix**
```typescript
// Fixed voice messages to follow same pattern as text messages:
// 1. Create temporary message with temp_id and delivery_status: 'sending'
// 2. Store locally first and notify UI immediately
// 3. Send to server with temp_id for proper duplicate detection
// 4. Update local message with server response and remove temp_id

const uniqueId = `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const tempMessage: Message = {
  id: uniqueId,
  temp_id: uniqueId,
  appointment_id: appointmentId,
  sender_id: senderId,
  sender_name: senderName,
  message: messageText,
  message_type: 'voice',
  media_url: audioUrl,
  timestamp: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  delivery_status: 'sending',
};

// Store the temporary message locally first
await this.storeMessage(appointmentId, tempMessage);

// Notify UI immediately with the temporary message
const callback = this.updateCallbacks.get(appointmentId);
if (callback) {
  const currentMessages = await this.getMessages(appointmentId);
  await this.notifyCallback(appointmentId, currentMessages);
}

// Send to server with temp_id
const response = await apiService.post(`/chat/${appointmentId}/messages`, {
  message: messageText,
  message_type: 'voice',
  media_url: audioUrl,
  temp_id: uniqueId
});

// Update local message with server response
const updatedMessage: Message = {
  ...tempMessage,
  id: serverMessage.id,
  delivery_status: 'sent',
};
delete updatedMessage.temp_id;
await this.updateMessageInStorage(appointmentId, uniqueId, updatedMessage);
```

### Backend Fixes (MessageStorageService.php)

#### 1. **Message Type-Specific Duplicate Detection**
```php
// Check for duplicate messages by temp_id or content
$isDuplicate = false;
$existingMessage = null;

foreach ($messages as $existingMsg) {
    // Check by temp_id first
    if (!empty($messageData['temp_id']) && !empty($existingMsg['temp_id']) && 
        $existingMsg['temp_id'] === $messageData['temp_id']) {
        $isDuplicate = true;
        $existingMessage = $existingMsg;
        break;
    }
    
    // Check by content and sender within different time windows
    if ($existingMsg['sender_id'] === $messageData['sender_id'] && 
        $existingMsg['message'] === $messageData['message'] &&
        $existingMsg['message_type'] === ($messageData['message_type'] ?? 'text')) {
        
        $existingTime = \Carbon\Carbon::parse($existingMsg['created_at']);
        $currentTime = now();
        
        // Different time windows for different message types
        $timeWindow = 30; // Default 30 seconds for text messages
        if (($messageData['message_type'] ?? 'text') === 'voice') {
            $timeWindow = 60; // 60 seconds for voice messages
        } else if (($messageData['message_type'] ?? 'text') === 'image') {
            $timeWindow = 45; // 45 seconds for image messages
        }
        
        if ($currentTime->diffInSeconds($existingTime) < $timeWindow) {
            $isDuplicate = true;
            $existingMessage = $existingMsg;
            break;
        }
    }
}

if ($isDuplicate) {
    return $existingMessage; // Return existing message instead of creating duplicate
}
```

### Backend Fixes (ChatController.php)

#### 1. **Message Type-Specific Rate Limiting**
```php
// Rate limiting: Check if user has sent a message recently
$messageType = $request->message_type ?? 'text';
$rateLimitKey = "message_rate_limit_{$user->id}_{$appointmentId}_{$messageType}";
$lastMessageTime = Cache::get($rateLimitKey);
$currentTime = now();

// Different rate limits for different message types
$rateLimitSeconds = 2; // Default for text messages
if ($messageType === 'voice') {
    $rateLimitSeconds = 5; // 5 seconds for voice messages (longer processing time)
} else if ($messageType === 'image') {
    $rateLimitSeconds = 3; // 3 seconds for image messages
}

if ($lastMessageTime) {
    $timeSinceLastMessage = $currentTime->diffInSeconds($lastMessageTime);
    if ($timeSinceLastMessage < $rateLimitSeconds) {
        return response()->json([
            'success' => false,
            'message' => "Please wait {$rateLimitSeconds} seconds before sending another {$messageType} message"
        ], 429);
    }
}

// Set rate limit
Cache::put($rateLimitKey, $currentTime, 60); // Cache for 1 minute
```

### Frontend Fixes (chat/[appointmentId].tsx)

#### 1. **Removed Force Poll**
```typescript
// Removed the force immediate poll after sending message
// Let auto-sync handle message updates naturally
```

#### 2. **Improved Voice Recording State Management**
```typescript
// Reset any existing recording state first
if (recording) {
  await recording.stopAndUnloadAsync();
  setRecording(null);
}

// Reset recording state completely after sending
setRecordingTime(0);
setRecording(null);
setIsRecording(false);
```

## Testing

Two test scripts have been created to verify the fixes:

### Text Message Testing
```bash
cd backend
php ../scripts/test_message_duplication.php
```

### Voice Message Testing
```bash
cd backend
php ../scripts/test_voice_messages.php
```

The test scripts verify:
- Basic message storage
- Duplicate detection by temp_id
- Duplicate detection by content
- Message type-specific rate limiting
- Voice recording state management
- Proper cleanup

## Expected Results

After implementing these fixes:

1. **No More Duplicate Messages**: Messages should only appear once in the chat
2. **Reduced API Calls**: Sync intervals are longer and smarter
3. **Better Performance**: Less frequent polling and fewer duplicate operations
4. **Message Type-Specific Rate Limiting**: 
   - Text messages: 2 seconds
   - Voice messages: 5 seconds
   - Image messages: 3 seconds
5. **Voice Message Support**: Users can send multiple voice messages without being blocked
6. **Consistent State**: UI updates are more predictable and stable
7. **Proper Voice Recording**: Recording state is properly reset after each voice message

## Monitoring

To monitor the effectiveness of these fixes:

1. **Check Console Logs**: Look for sync skip messages and duplicate detection logs
2. **Monitor Network Traffic**: Should see fewer API calls
3. **User Feedback**: Users should no longer report duplicate messages
4. **Performance Metrics**: Chat should feel more responsive

## Rollback Plan

If issues arise, the changes can be rolled back by:

1. Reverting sync interval to 3000ms
2. Removing rate limiting code
3. Restoring original callback debounce time
4. Removing duplicate detection logic

However, these fixes are designed to be non-breaking and should improve the user experience. 