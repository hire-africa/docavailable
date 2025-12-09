# WhatsApp-Like Call Notifications Implementation

## Overview
This implementation enhances call notifications to work like WhatsApp calls, showing full-screen notifications even when the app is in the background or the screen is off.

## Key Features Implemented

### 1. Enhanced Background Notifications
- **Full-screen notifications** that appear even when the screen is off
- **High priority notifications** that bypass Do Not Disturb mode
- **Persistent notifications** that stay visible until answered or declined
- **Custom vibration patterns** for better call awareness

### 2. Call Action Buttons
- **Answer button** - Directly answers the call and navigates to call screen
- **Decline button** - Declines the call and sends notification to backend
- **Action handling** - Proper backend integration for call states

### 3. Improved Notification Channels
- **Calls channel** with maximum importance and priority
- **Bypass DND** - Notifications appear even in Do Not Disturb mode
- **Public visibility** - Notifications visible on lock screen
- **Custom sounds and vibration** - Enhanced audio feedback

### 4. Backend Integration
- **Answer/Decline endpoints** - New API endpoints for call actions
- **Call session tracking** - Enhanced database schema for call states
- **Notification data** - Rich notification payload with caller information

## Files Modified

### Frontend Files
1. **`index.js`** - Enhanced background notification handler
2. **`app/_layout.tsx`** - Improved notification channels and categories
3. **`hooks/global-notification-handler.tsx`** - Call action button handling
4. **`services/callNotificationService.ts`** - New service for call notification management
5. **`app.json`** - Added necessary Android permissions

### Backend Files
1. **`backend/app/Notifications/IncomingCallNotification.php`** - Enhanced FCM payload
2. **`backend/app/Http/Controllers/CallSessionController.php`** - Added answer/decline methods
3. **`backend/app/Models/CallSession.php`** - Added new fields for call states
4. **`backend/routes/api.php`** - Added new API endpoints
5. **`backend/database/migrations/...`** - Database schema updates

## Key Implementation Details

### Notification Channels Configuration
```javascript
await Notifications.setNotificationChannelAsync('calls', {
  name: 'Calls',
  importance: AndroidImportance.MAX,
  sound: 'default',
  vibrationPattern: [0, 250, 250, 250],
  bypassDnd: true,
  lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
  enableLights: true,
  enableVibrate: true,
  showBadge: true,
});
```

### Call Action Categories
```javascript
await Notifications.setNotificationCategoryAsync('incoming_call', [
  {
    identifier: 'ANSWER_CALL',
    buttonTitle: 'Answer',
    options: {
      isDestructive: false,
      isAuthenticationRequired: false,
    },
  },
  {
    identifier: 'DECLINE_CALL',
    buttonTitle: 'Decline',
    options: {
      isDestructive: true,
      isAuthenticationRequired: false,
    },
  },
]);
```

### Enhanced FCM Payload
```php
return [
    'notification' => [
        'title' => $callerName . ' - ' . ($callType === 'video' ? 'Video Call' : 'Voice Call'),
        'body' => 'Incoming call...',
        'sound' => 'default',
        'priority' => 'high',
        'visibility' => 'public',
        'tag' => 'incoming_call_' . $appointmentId,
    ],
    'data' => [
        'type' => 'incoming_call',
        'categoryId' => 'incoming_call',
        'priority' => 'high',
        'fullScreenAction' => 'true',
        'channelId' => 'calls',
        // ... other call data
    ],
    'android' => [
        'priority' => 'high',
        'notification' => [
            'channel_id' => 'calls',
            'priority' => 'high',
            'visibility' => 'public',
            'sound' => 'default',
            'vibrate_timings' => [0, 250, 250, 250],
            // ... other Android-specific settings
        ],
    ],
];
```

## Android Permissions Added
```json
{
  "permissions": [
    "android.permission.WAKE_LOCK",
    "android.permission.VIBRATE",
    "android.permission.USE_FULL_SCREEN_INTENT",
    "android.permission.SYSTEM_ALERT_WINDOW",
    "android.permission.USE_FINGERPRINT",
    "android.permission.USE_BIOMETRIC",
    "android.permission.RECORD_AUDIO",
    "android.permission.CAMERA",
    "android.permission.MODIFY_AUDIO_SETTINGS",
    "android.permission.BLUETOOTH",
    "android.permission.BLUETOOTH_CONNECT",
    "android.permission.BLUETOOTH_ADMIN"
  ]
}
```

## Database Schema Updates
New fields added to `call_sessions` table:
- `answered_at` - Timestamp when call was answered
- `answered_by` - User ID who answered the call
- `declined_at` - Timestamp when call was declined
- `declined_by` - User ID who declined the call
- `decline_reason` - Reason for declining the call

## API Endpoints Added
- `POST /api/call-sessions/answer` - Handle call answer
- `POST /api/call-sessions/decline` - Handle call decline

## How It Works

### 1. Incoming Call Flow
1. Backend sends FCM notification with enhanced payload
2. Background handler creates full-screen notification with action buttons
3. User can tap "Answer" or "Decline" buttons directly from notification
4. Action buttons trigger appropriate backend API calls
5. Call screen opens automatically when answered

### 2. Background/Killed State
1. FCM notification is received even when app is killed
2. Background handler creates persistent notification
3. Notification appears on lock screen with action buttons
4. Tapping notification or action buttons opens app and navigates to call

### 3. Foreground State
1. FCM notification is received in foreground
2. Enhanced notification is shown with action buttons
3. Call screen is also opened automatically
4. User can interact with either the notification or the call screen

## Testing Recommendations

### 1. Background Testing
- Test with app in background (not killed)
- Test with app completely killed
- Test with screen off
- Test with Do Not Disturb mode enabled

### 2. Notification Testing
- Verify notification appears on lock screen
- Test action button functionality
- Verify notification persistence
- Test notification dismissal

### 3. Call Flow Testing
- Test answer flow from notification
- Test decline flow from notification
- Test regular tap on notification
- Verify backend state updates

## Troubleshooting

### Common Issues
1. **Notifications not appearing** - Check Android notification permissions
2. **Action buttons not working** - Verify notification categories are set up
3. **Background notifications not working** - Check FCM configuration
4. **Call screen not opening** - Verify navigation routing

### Debug Steps
1. Check FCM token registration
2. Verify notification channel configuration
3. Test with different Android versions
4. Check device-specific notification settings

## Future Enhancements

### Potential Improvements
1. **Custom ringtones** - Add custom call ringtones
2. **Caller photo** - Display caller profile picture in notification
3. **Call history** - Track answered/declined calls
4. **Missed call notifications** - Notify about missed calls
5. **Call recording** - Optional call recording feature

### Performance Optimizations
1. **Notification batching** - Batch multiple notifications
2. **Background task optimization** - Optimize background processing
3. **Memory management** - Better memory usage for notifications
4. **Battery optimization** - Minimize battery impact

## Conclusion

This implementation provides WhatsApp-like call notification functionality that works reliably in background and screen-off scenarios. The solution includes both frontend and backend components, ensuring a complete call notification system that enhances user experience and call reliability.

The key to success is proper configuration of Android notification channels, FCM payload structure, and handling of different app states (foreground, background, killed). With these enhancements, users will never miss important calls, even when their device is locked or the app is not actively running.
