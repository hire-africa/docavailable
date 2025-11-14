# 🏥 DocAvailable - Comprehensive Permissions System

## Overview

DocAvailable now includes a comprehensive permission management system that requests all necessary permissions on first launch and provides ongoing permission monitoring. This ensures reliable telemedicine functionality, especially for incoming calls and notifications.

## 🚀 What's New

### Automatic Permission Requests
- **First Launch**: Requests ALL permissions automatically
- **Subsequent Launches**: Checks critical permissions and alerts if missing
- **Feature-Based**: Requests specific permissions when features are used
- **User-Friendly**: Clear explanations for why each permission is needed

### Advanced System Permissions
- **Display Over Other Apps**: Allows incoming calls to show on lock screen
- **Battery Optimization Exclusion**: Prevents Android from killing the app
- **Auto-start Permissions**: Manufacturer-specific background app permissions
- **Do Not Disturb Bypass**: Medical calls can ring even in DND mode

## 📱 Permissions Requested

### Basic App Permissions
- ✅ Internet access
- ✅ Network state
- ✅ WiFi state
- ✅ Wake lock (keep screen on during calls)
- ✅ Vibration

### Media Permissions
- 📷 **Camera**: Video calls, profile pictures, medical photos
- 🎤 **Microphone**: Voice calls, audio messages
- 🖼️ **Photo Library**: Share medical images, profile pictures

### Communication Permissions
- 📞 **Phone**: Make emergency calls, handle incoming calls
- 👥 **Contacts**: Invite family members, emergency contacts
- 📅 **Calendar**: Schedule appointments, reminders

### Location & Services
- 📍 **Location**: Find nearby doctors, emergency services
- 🔔 **Notifications**: Incoming calls, messages, appointments

### Advanced System Permissions (Android)
- 🔴 **Display Over Other Apps**: CRITICAL for incoming calls on lock screen
- 🔋 **Battery Optimization Exclusion**: CRITICAL for background operation
- 🚀 **Auto-start Permission**: Manufacturer-specific (Samsung, Huawei, Xiaomi, etc.)
- 🔕 **Do Not Disturb Bypass**: Medical emergency calls

## 🛠️ Implementation

### Services

#### `comprehensivePermissionManager.ts`
Main service that handles all permission requests and checks.

```typescript
// Check if first launch
const isFirst = await comprehensivePermissionManager.isFirstLaunch();

// Request all permissions on first launch
if (isFirst) {
  const result = await comprehensivePermissionManager.requestAllPermissionsOnFirstLaunch();
}

// Check critical permissions anytime
const status = await comprehensivePermissionManager.checkCriticalPermissions();
```

#### `PermissionPrompt.tsx`
Helper component for requesting specific permissions with user-friendly prompts.

```typescript
// Request camera permission
const granted = await PermissionPrompt.requestCameraPermission();

// Show system permissions guide
await PermissionPrompt.showSystemPermissionsGuide();

// Check all permissions status
const status = await PermissionPrompt.checkAllPermissions();
```

### Integration in App

The system is automatically initialized in `_layout.tsx`:

```typescript
// On first launch - requests all permissions
const result = await comprehensivePermissionManager.requestAllPermissionsOnFirstLaunch();

// On subsequent launches - checks critical permissions
const criticalCheck = await comprehensivePermissionManager.checkCriticalPermissions();
```

## 🔧 Manual Setup Required

Some permissions require manual setup by the user:

### 1. Display Over Other Apps (CRITICAL)
**Why**: Allows incoming calls to show when screen is locked
**Steps**:
1. Settings → Apps → DocAvailable
2. Advanced → Special app access
3. Display over other apps → Toggle ON

### 2. Battery Optimization Exclusion (CRITICAL)
**Why**: Prevents Android from killing the app in background
**Steps**:
1. Settings → Apps → DocAvailable
2. Battery → Don't optimize or Unrestricted

### 3. Auto-start Permission (Manufacturer Specific)
**Why**: Allows app to start automatically for incoming calls

**Samsung**: Settings → Apps → DocAvailable → Battery → Allow background activity
**Huawei**: Settings → Apps → DocAvailable → App launch → Manage manually
**Xiaomi**: Settings → Apps → Manage apps → DocAvailable → Autostart
**OnePlus**: Settings → Apps → DocAvailable → Battery → Battery optimization
**Oppo**: Settings → Apps → DocAvailable → Battery → Background app refresh

### 4. Do Not Disturb Bypass
**Why**: Medical calls can ring even in DND mode
**Steps**:
1. Settings → Sound & vibration → Do Not Disturb
2. Apps → DocAvailable → Override Do Not Disturb

## 🧪 Testing Your Setup

### Complete Test Procedure
1. Complete all manual setup steps above
2. Close DocAvailable completely
3. Turn off your screen and wait 30 seconds
4. Ask someone to call you through the app
5. Your screen should wake up with the incoming call!

### Quick Permission Check
```typescript
const status = await PermissionPrompt.checkAllPermissions();
console.log('Can receive calls:', status.canReceiveCalls);
console.log('Can send notifications:', status.canSendNotifications);
console.log('Can access media:', status.canAccessMedia);
```

## 📊 Permission Status Monitoring

The app continuously monitors permission status:

- **Green**: All permissions granted ✅
- **Yellow**: Some permissions missing ⚠️
- **Red**: Critical permissions missing ❌

## 🆘 Troubleshooting

### Calls Not Working When Screen is Off
1. Check "Display Over Other Apps" permission
2. Disable battery optimization for DocAvailable
3. Enable auto-start permission (manufacturer specific)
4. Test with screen off

### Notifications Not Showing
1. Check notification permissions
2. Verify notification channels are created
3. Check Do Not Disturb settings
4. Ensure app is not being killed by battery optimization

### Camera/Microphone Not Working
1. Check camera and microphone permissions
2. Restart the app after granting permissions
3. Check if other apps are using camera/microphone

## 🔄 Permission Recovery

If permissions are lost or denied:

```typescript
// Re-request all permissions
const result = await comprehensivePermissionManager.requestAllPermissions();

// Show setup guide for manual permissions
await PermissionPrompt.showSystemPermissionsGuide();

// Check what's missing
const status = await comprehensivePermissionManager.checkCriticalPermissions();
```

## 📝 Developer Notes

### Adding New Permissions
1. Add to `app.json` permissions array
2. Update `comprehensivePermissionManager.ts`
3. Add user-friendly prompts in `PermissionPrompt.tsx`
4. Update this documentation

### Testing Permissions
- Use Android emulator with different API levels
- Test on various manufacturer devices (Samsung, Huawei, Xiaomi)
- Test permission denial and recovery flows
- Test first launch vs. subsequent launches

### Best Practices
- Always explain WHY a permission is needed
- Provide fallback functionality when possible
- Guide users to manual setup for critical permissions
- Monitor permission status throughout app lifecycle

## 🏥 Medical App Compliance

This permission system ensures compliance with medical app requirements:

- **HIPAA**: Secure communication channels
- **Emergency Access**: Critical calls can bypass DND
- **Reliability**: Background operation for medical emergencies
- **User Control**: Clear permission explanations and controls

## 📞 Support

If users experience permission issues:
1. Check device manufacturer-specific settings
2. Verify Android version compatibility
3. Test with different network conditions
4. Contact support with device model and Android version

---

**Remember**: The goal is to provide reliable telemedicine services. These permissions ensure that patients can receive medical consultations and emergency calls regardless of their device state.
