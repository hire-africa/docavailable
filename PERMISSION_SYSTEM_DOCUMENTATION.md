# Comprehensive Permission System Documentation

## Overview
This permission system provides a complete solution for managing app permissions, including first-time setup, ongoing permission checks, and user-friendly permission requests throughout the app.

## Key Features

### 1. **First-Time Permission Setup**
- Automatic permission request screen on first app launch
- Categorized permissions (Essential vs Optional)
- Progress tracking and visual feedback
- Skip option for non-essential permissions

### 2. **Comprehensive Permission Management**
- Support for all major mobile permissions
- Cross-platform compatibility (iOS & Android)
- Permission status tracking and caching
- Smart permission request flow

### 3. **User-Friendly Interface**
- Beautiful permission request screen
- Clear explanations for each permission
- Visual progress indicators
- Settings integration for denied permissions

## Architecture

### Core Components

#### 1. **PermissionManager Service** (`services/permissionManager.ts`)
Central service for managing all permissions:

```typescript
// Check if first launch
const isFirst = await PermissionManager.isFirstLaunch();

// Get all permissions with status
const permissions = await PermissionManager.getAllPermissions();

// Request specific permission
const result = await PermissionManager.requestPermission('camera');

// Request all essential permissions
const result = await PermissionManager.requestEssentialPermissions();
```

#### 2. **PermissionRequestScreen** (`components/PermissionRequestScreen.tsx`)
Full-screen component for first-time permission setup:

```typescript
<PermissionRequestScreen
  onComplete={(allEssentialGranted) => {
    // Handle completion
  }}
  onSkip={() => {
    // Handle skip
  }}
/>
```

#### 3. **PermissionWrapper** (`components/PermissionWrapper.tsx`)
Wrapper component that handles the permission flow:

```typescript
<PermissionWrapper onPermissionComplete={(granted) => {
  console.log('All essential permissions granted:', granted);
}}>
  {/* Your app content */}
</PermissionWrapper>
```

#### 4. **Permission Hooks** (`hooks/usePermissions.ts`)
React hooks for easy permission management:

```typescript
// General permission hook
const { granted, request, canAskAgain } = usePermission('camera');

// Specific permission hooks
const cameraPermission = useCameraPermission();
const microphonePermission = useMicrophonePermission();
const notificationPermission = useNotificationPermission();
```

#### 5. **PermissionGuard** (`components/PermissionGuard.tsx`)
Component for protecting features that require permissions:

```typescript
<PermissionGuard permission="camera">
  <CameraComponent />
</PermissionGuard>
```

## Supported Permissions

### Essential Permissions (Required)
- **Camera** - Video calls and profile pictures
- **Microphone** - Voice calls and audio recording
- **Notifications** - Call notifications and messages
- **Storage** - Save photos, documents, and app data
- **Phone** - Call functionality and notifications

### Optional Permissions
- **Bluetooth** - Headset support during calls
- **Location** - Find nearby doctors and emergency services
- **Media Library** - Select and share photos in chat
- **Contacts** - Invite friends and family
- **Calendar** - Add appointments to calendar

## Implementation Guide

### 1. **Basic Setup**

The permission system is automatically integrated into your app through the `PermissionWrapper` in `app/_layout.tsx`:

```typescript
<PermissionWrapper onPermissionComplete={(allEssentialGranted) => {
  console.log('Permission flow completed. All essential granted:', allEssentialGranted);
}}>
  <Stack>
    {/* Your app screens */}
  </Stack>
</PermissionWrapper>
```

### 2. **Using Permission Hooks**

```typescript
import { useCameraPermission, useMicrophonePermission } from '../hooks/usePermissions';

function VideoCallComponent() {
  const cameraPermission = useCameraPermission();
  const microphonePermission = useMicrophonePermission();

  const startCall = async () => {
    if (!cameraPermission.granted) {
      await cameraPermission.requestWithExplanation();
      return;
    }
    
    if (!microphonePermission.granted) {
      await microphonePermission.requestWithExplanation();
      return;
    }

    // Start video call
  };

  return (
    <View>
      {cameraPermission.granted && microphonePermission.granted ? (
        <VideoCallInterface />
      ) : (
        <PermissionRequestMessage />
      )}
    </View>
  );
}
```

### 3. **Using PermissionGuard**

```typescript
import PermissionGuard from '../components/PermissionGuard';

function CameraScreen() {
  return (
    <PermissionGuard 
      permission="camera"
      onPermissionGranted={() => console.log('Camera access granted')}
      onPermissionDenied={() => console.log('Camera access denied')}
    >
      <CameraComponent />
    </PermissionGuard>
  );
}
```

### 4. **Manual Permission Checks**

```typescript
import { usePermissions } from '../hooks/usePermissions';

function MyComponent() {
  const { 
    isPermissionGranted, 
    requestPermission, 
    openSettings 
  } = usePermissions();

  const handleFeature = async () => {
    if (!isPermissionGranted('camera')) {
      const granted = await requestPermission('camera');
      if (!granted) {
        // Show settings option
        openSettings();
        return;
      }
    }
    
    // Proceed with camera feature
  };
}
```

## Configuration

### Android Permissions (`app.json`)

```json
{
  "android": {
    "permissions": [
      "android.permission.CAMERA",
      "android.permission.RECORD_AUDIO",
      "android.permission.POST_NOTIFICATIONS",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "android.permission.CALL_PHONE",
      "android.permission.BLUETOOTH_CONNECT",
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.READ_CONTACTS",
      "android.permission.READ_CALENDAR"
    ]
  }
}
```

### iOS Permissions (`app.json`)

```json
{
  "ios": {
    "infoPlist": {
      "NSCameraUsageDescription": "This app needs access to camera for video calls and profile pictures",
      "NSMicrophoneUsageDescription": "This app needs access to microphone for voice calls and audio recording",
      "NSLocationWhenInUseUsageDescription": "This app needs location access to find nearby doctors",
      "NSContactsUsageDescription": "This app needs access to contacts to invite friends and family",
      "NSCalendarsUsageDescription": "This app needs access to calendar to add appointments"
    }
  }
}
```

## Permission Flow

### 1. **First Launch**
1. App starts → `PermissionWrapper` checks if first launch
2. If first launch → Show `PermissionRequestScreen`
3. User grants/denies permissions → Mark as launched
4. Continue to main app

### 2. **Subsequent Launches**
1. App starts → `PermissionWrapper` checks essential permissions
2. If all essential granted → Show main app
3. If some missing → Show `PermissionRequestScreen` again

### 3. **Runtime Permission Requests**
1. Feature needs permission → Check current status
2. If not granted → Show explanation dialog
3. Request permission → Update status
4. If denied permanently → Show settings option

## Best Practices

### 1. **Permission Timing**
- Request permissions when needed, not all at once
- Explain why each permission is needed
- Group related permissions together

### 2. **User Experience**
- Always explain the benefit of granting permission
- Provide fallback options when permission is denied
- Make it easy to grant permissions later

### 3. **Error Handling**
- Handle permission denied gracefully
- Provide clear instructions for manual permission granting
- Don't block essential app functionality

### 4. **Testing**
- Test on both iOS and Android
- Test with permissions granted/denied
- Test first launch vs subsequent launches

## Troubleshooting

### Common Issues

#### 1. **Permissions Not Requested**
- Check if permissions are declared in `app.json`
- Verify `PermissionWrapper` is properly integrated
- Check console for error messages

#### 2. **Permission Denied Permanently**
- User can only grant via device settings
- Use `openSettings()` to guide user
- Provide clear instructions

#### 3. **iOS Permission Issues**
- Ensure usage descriptions are in `infoPlist`
- Check iOS version compatibility
- Verify permission keys match exactly

#### 4. **Android Permission Issues**
- Check target SDK version
- Verify permission names are correct
- Test on different Android versions

### Debug Tips

```typescript
// Check permission status
const { permissions } = usePermissions();
console.log('All permissions:', permissions);

// Check specific permission
const cameraPermission = useCameraPermission();
console.log('Camera permission:', cameraPermission);

// Force reload permissions
const { loadPermissions } = usePermissions();
await loadPermissions();
```

## Future Enhancements

### Planned Features
1. **Permission Analytics** - Track permission grant rates
2. **Smart Timing** - Request permissions at optimal moments
3. **Permission Education** - In-app tutorials for permissions
4. **Bulk Permission Management** - Manage all permissions in settings
5. **Permission Recovery** - Automatic retry for failed permissions

### Customization Options
1. **Custom Permission Screens** - Branded permission request UI
2. **Permission Categories** - Custom permission groupings
3. **Conditional Permissions** - Show/hide based on user type
4. **Permission Onboarding** - Step-by-step permission walkthrough

## Conclusion

This permission system provides a comprehensive solution for managing app permissions with a focus on user experience and developer ease of use. The modular architecture allows for easy customization and extension while maintaining consistency across the app.

The system handles all common permission scenarios including first-time setup, runtime requests, and permission recovery, ensuring your app works smoothly regardless of the user's permission choices.
