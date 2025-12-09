# Session Push Notifications Implementation

## Overview

This implementation provides comprehensive push notifications for session events (start/end) with proper notification icon configuration. The system automatically sends notifications when sessions start and end, both locally and via push notifications.

## 🔔 Features Implemented

### 1. **Session Notification Service**
- **File**: `services/sessionNotificationService.ts`
- **Features**:
  - Session started notifications
  - Session ended notifications (with duration)
  - Session reminder notifications
  - Support for both text and appointment sessions
  - Automatic push notification sending via backend API

### 2. **Session Service Integration**
- **File**: `services/sessionService.ts` (updated)
- **Integration Points**:
  - `startTextSession()` - Sends notifications when text sessions start
  - `endTextSession()` - Sends notifications when text sessions end
  - `startTextAppointmentSession()` - Sends notifications for appointment sessions
  - `endTextAppointmentSession()` - Sends notifications when appointment sessions end

### 3. **Notification Handler**
- **File**: `services/sessionNotificationHandler.ts`
- **Features**:
  - Handles incoming push notifications
  - Foreground notification processing
  - Background notification processing
  - Navigation from notifications
  - In-app notification display

### 4. **Notification Icon Configuration**
- **File**: `app.json` (updated)
- **Configuration**:
  - Android notification icon: `./assets/images/notification-icon.png`
  - iOS notification icon: `./assets/images/notification-icon.png`
  - Notification color: `#4CAF50` (DocAvailable green)

## 📱 How It Works

### Session Started Flow:
1. User starts a session (text or appointment)
2. `sessionService.startTextSession()` is called
3. Session is created via API
4. Real-time event is triggered
5. **Session notifications are sent**:
   - Local notification added to notification store
   - Push notification sent to both patient and doctor
   - Notifications include session details and navigation links

### Session Ended Flow:
1. User ends a session
2. `sessionService.endTextSession()` is called
3. Session is ended via API
4. Real-time event is triggered
5. **Session notifications are sent**:
   - Local notification with session duration
   - Push notification to both parties
   - Notifications include completion details

## 🛠️ Setup Instructions

### 1. **Initialize Session Notifications**

Add to your app initialization (e.g., in `_layout.tsx` or `App.tsx`):

```typescript
import { SessionNotificationHandler } from './services/sessionNotificationHandler';

// In your app initialization
useEffect(() => {
  // Initialize session notification handlers
  SessionNotificationHandler.initialize();
}, []);
```

### 2. **Create Notification Icon**

You need to create a notification icon file:

**Required File**: `assets/images/notification-icon.png`

**Requirements**:
- **Android**: 24x24dp, white/transparent PNG (will be tinted with the color)
- **iOS**: Multiple sizes (20x20, 29x29, 40x40, 58x58, 60x60, 80x80, 87x87, 120x120, 180x180)
- **Format**: PNG with transparency
- **Style**: Simple, monochrome icon (Android will apply color tint)

**Example Icon Creation**:
```bash
# Create a simple notification icon (you can use your app icon simplified)
# Make sure it's white/transparent and follows platform guidelines
```

### 3. **Backend API Requirements**

Your backend needs to support the following endpoint:

```php
// POST /api/notifications/push
{
  "title": "Session Started",
  "body": "Your session with Dr. Smith has started",
  "type": "session_started",
  "recipient_id": "user_123",
  "data": {
    "sessionId": "session_456",
    "sessionType": "text",
    "appointmentId": "appointment_789", // optional
    "action": "session_started"
  }
}
```

## 📋 Notification Types

### 1. **Session Started**
- **Type**: `session_started`
- **Triggers**: When `startTextSession()` or `startTextAppointmentSession()` is called
- **Recipients**: Both patient and doctor
- **Content**: 
  - Patient: "Your session with Dr. [Name] has started"
  - Doctor: "New session with [Patient] has started"

### 2. **Session Ended**
- **Type**: `session_ended`
- **Triggers**: When `endTextSession()` or `endTextAppointmentSession()` is called
- **Recipients**: Both patient and doctor
- **Content**: 
  - Patient: "Your session with Dr. [Name] has ended (Duration: 15 minutes)"
  - Doctor: "Session with [Patient] has ended (Duration: 15 minutes)"

### 3. **Session Reminder** (Optional)
- **Type**: `session_reminder`
- **Triggers**: Can be scheduled for upcoming appointments
- **Recipients**: Both patient and doctor
- **Content**: "Your session starts in 5 minutes"

## 🧪 Testing

### Test Session Notifications:

```typescript
import { SessionNotificationHandler } from './services/sessionNotificationHandler';

// Test notifications (for development)
SessionNotificationHandler.testSessionNotifications();
```

### Manual Testing:

1. **Start a Session**: Create a text session and verify notifications are sent
2. **End a Session**: End the session and verify completion notifications
3. **Check Notification Icon**: Verify the icon appears correctly in system notifications
4. **Test Navigation**: Tap notifications and verify proper navigation

## 🔧 Customization

### 1. **Notification Content**

Modify `sessionNotificationService.ts` to customize notification messages:

```typescript
// Customize notification titles and messages
if (recipientType === 'patient') {
  title = 'Session Started';
  message = `Your ${sessionType} session with Dr. ${doctorName} has started`;
}
```

### 2. **Notification Icon**

Update `app.json` to change notification icon:

```json
{
  "android": {
    "notification": {
      "icon": "./assets/images/your-custom-icon.png",
      "color": "#YOUR_COLOR"
    }
  }
}
```

### 3. **Navigation Behavior**

Modify `sessionNotificationHandler.ts` to customize navigation:

```typescript
private static navigateFromNotification(data: any): void {
  // Customize navigation logic based on your routing system
  switch (data.action) {
    case 'session_started':
      // Your custom navigation logic
      break;
  }
}
```

## 📁 Files Created/Modified

### New Files:
- `services/sessionNotificationService.ts` - Main notification service
- `services/sessionNotificationHandler.ts` - Notification handler and router
- `SESSION_NOTIFICATIONS_IMPLEMENTATION.md` - This documentation

### Modified Files:
- `services/sessionService.ts` - Added notification calls
- `services/notificationService.ts` - Added session notification types
- `app.json` - Added notification icon configuration

## 🚀 Next Steps

1. **Create Notification Icon**: Add `assets/images/notification-icon.png`
2. **Initialize Handler**: Add initialization to your app startup
3. **Backend Integration**: Implement the push notification endpoint
4. **Test Thoroughly**: Test all notification scenarios
5. **Customize**: Adjust messages and navigation as needed

## 🔍 Troubleshooting

### Common Issues:

1. **Notifications Not Appearing**:
   - Check if push notification permissions are granted
   - Verify Firebase configuration
   - Check backend API endpoint

2. **Icon Not Showing**:
   - Ensure `notification-icon.png` exists in `assets/images/`
   - Verify icon meets platform requirements
   - Rebuild the app after adding icon

3. **Navigation Not Working**:
   - Check router implementation in `sessionNotificationHandler.ts`
   - Verify screen routes exist
   - Test with console logs first

The session notification system is now fully implemented and ready for use! 🎉
