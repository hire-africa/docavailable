# Reply Messages Fix

## Problem
Reply messages (messages with `replyTo` context) were only showing correctly on the sender's side. On the receiver's side, they appeared as normal text messages without the reply context.

## Root Cause
The `replyTo` data was being added to the immediate message display on the sender's side, but was **not being sent via WebRTC** to the receiver. The WebRTC service's `sendMessage` function didn't accept or transmit reply data.

### What Was Happening:
1. **Sender side**: Reply context added to local message → Shows correctly
2. **WebRTC transmission**: Only message text sent (no `replyTo` field)
3. **Receiver side**: Receives plain text → Shows as normal message

## Solution

### 1. Updated WebRTC Service to Accept Reply Data

**File**: `services/webrtcChatService.ts`

```typescript
// Before - No reply support ❌
async sendMessage(message: string): Promise<ChatMessage | null> {
  const messageData = {
    type: 'chat-message',
    content: message,
    // No replyTo field
  };
}

// After - Accepts and sends reply data ✅
async sendMessage(
  message: string, 
  replyTo?: { messageId: string; message: string; senderName: string }
): Promise<ChatMessage | null> {
  const messageData: any = {
    type: 'chat-message',
    content: message,
  };
  
  // Include replyTo if provided
  if (replyTo) {
    messageData.replyTo = replyTo;
  }
}
```

### 2. Updated Message Normalization to Preserve Reply Data

**File**: `services/webrtcChatService.ts`

```typescript
// Before - Reply data lost ❌
const normalized: ChatMessage = {
  id: messageId,
  message: raw.message ?? raw.content ?? '',
  // No replyTo field
};

// After - Reply data preserved ✅
const normalized: ChatMessage = {
  id: messageId,
  message: raw.message ?? raw.content ?? '',
  ...(raw.replyTo && { replyTo: raw.replyTo }) // Include replyTo if present
};
```

### 3. Updated Chat Component to Pass Reply Data

**File**: `app/chat/[appointmentId].tsx`

```typescript
// Before - Reply data not sent ❌
const message = await webrtcChatService.sendMessage(messageText);

// After - Reply data included ✅
const replyData = replyingTo ? {
  messageId: replyingTo.id || replyingTo.temp_id || '',
  message: replyingTo.message || '',
  senderName: replyingTo.sender_id === currentUserId ? 'You' : (chatInfo?.other_participant_name || 'User')
} : undefined;

const message = await webrtcChatService.sendMessage(messageText, replyData);
```

## How It Works Now

### Complete Flow:

1. **User replies to a message**
   - Taps reply button on a message
   - `replyingTo` state is set with message details

2. **Sender types and sends**
   - Message text entered
   - Reply context prepared: `{ messageId, message, senderName }`
   - Sent via WebRTC: `sendMessage(text, replyData)`

3. **WebRTC transmission**
   - Message data includes `replyTo` field
   - Sent via WebSocket to server
   - Server forwards to receiver

4. **Receiver gets message**
   - WebSocket receives message with `replyTo` field
   - Normalized message preserves `replyTo`
   - `onMessage` callback triggered

5. **Both sides display correctly**
   - Sender: Shows reply context (already had it locally)
   - Receiver: Shows reply context (now received via WebRTC)

## Reply Message UI

The reply context appears as a colored bar above the message:

```
┌─────────────────────────┐
│ Sender Name             │ ← Reply header
│ Original message text   │ ← Quoted message
├─────────────────────────┤
│ Reply message text      │ ← Actual reply
└─────────────────────────┘
```

## Benefits

- ✅ **Consistent display** - Both sender and receiver see reply context
- ✅ **Conversation threading** - Easy to follow conversation flow
- ✅ **WhatsApp-style UX** - Familiar reply interface
- ✅ **No data loss** - Reply context transmitted via WebRTC
- ✅ **Backward compatible** - Works with messages without replies

## Status: ✅ COMPLETE

All reply messages now display correctly on both sender and receiver sides!
