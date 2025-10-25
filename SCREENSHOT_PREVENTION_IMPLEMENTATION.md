# Screenshot Prevention Implementation

## Overview

This document describes the implementation of screenshot prevention features in the Doc Available chat application. The implementation provides multiple layers of protection to prevent unauthorized capture of sensitive medical conversations.

## Features Implemented

### 1. Cross-Platform Screenshot Prevention
- **iOS**: Uses `expo-screen-capture` to prevent screenshots and screen recording - shows black screen
- **Android**: Uses native `FLAG_SECURE` to block screenshots and screen recording - shows black screen
- **Automatic Detection**: Detects platform and applies appropriate prevention method
- **Black Screen Result**: When users attempt screenshots, they will see a black screen instead of chat content

### 2. Security Watermark Overlay (Optional)
- **Subtle Watermarks**: Displays 4 subtle watermarks across the screen
- **Customizable Text**: Configurable watermark text (default: "Doc Available - Confidential")
- **Low Opacity**: Very low opacity (0.05) since main protection is black screen
- **Rotation**: Angled watermarks for additional security

### 3. Screenshot Detection (iOS)
- **App State Monitoring**: Detects when app becomes active after potential screenshot
- **Notification System**: Can notify users when screenshots are attempted
- **Event Logging**: Logs screenshot attempts for security monitoring

### 4. Configuration Management
- **Persistent Settings**: Settings saved to AsyncStorage
- **Multiple Security Levels**: Basic, Enhanced, and Maximum protection levels
- **Runtime Configuration**: Can be enabled/disabled during app runtime
- **User Control**: Settings can be modified through UI

## Files Created/Modified

### New Files
1. `services/screenshotPreventionService.ts` - Core service for screenshot prevention
2. `hooks/useScreenshotPrevention.ts` - React hook for easy integration
3. `components/SecurityWatermark.tsx` - Watermark overlay component
4. `components/ScreenshotPreventionSettings.tsx` - Settings UI component
5. `android/app/src/main/java/com/docavailable/ScreenshotPreventionModule.java` - Android native module
6. `android/app/src/main/java/com/docavailable/ScreenshotPreventionPackage.java` - Android package registration

### Modified Files
1. `app/chat/[appointmentId].tsx` - Integrated screenshot prevention in chat
2. `android/app/src/main/java/com/docavailable/app/MainApplication.kt` - Registered native module
3. `package.json` - Added expo-screen-capture dependency

## Implementation Details

### Service Architecture

The `ScreenshotPreventionService` is a singleton that manages all screenshot prevention functionality:

```typescript
// Initialize with default configuration
await screenshotPreventionService.initialize();

// Enable screenshot prevention
await screenshotPreventionService.enableScreenshotPrevention();

// Update configuration
await screenshotPreventionService.updateConfig({
  enabled: true,
  showWatermark: true,
  watermarkText: 'Custom Watermark',
  notifyOnScreenshot: true,
  securityLevel: 'enhanced'
});
```

### React Hook Integration

The `useScreenshotPrevention` hook provides easy integration with React components:

```typescript
const { 
  isEnabled, 
  config, 
  enable, 
  disable, 
  updateConfig, 
  isLoading, 
  error 
} = useScreenshotPrevention();
```

### Android Native Implementation

The Android implementation uses `FLAG_SECURE` to prevent screenshots:

```java
// Enable FLAG_SECURE
currentActivity.getWindow().setFlags(
    WindowManager.LayoutParams.FLAG_SECURE,
    WindowManager.LayoutParams.FLAG_SECURE
);

// Disable FLAG_SECURE
currentActivity.getWindow().clearFlags(
    WindowManager.LayoutParams.FLAG_SECURE
);
```

### iOS Implementation

The iOS implementation uses `expo-screen-capture`:

```typescript
// Prevent screenshots
await ScreenCapture.preventScreenCaptureAsync();

// Allow screenshots
await ScreenCapture.allowScreenCaptureAsync();
```

## Security Levels

### Basic Level
- Screenshots show black screen
- Basic watermark overlay (optional)
- Suitable for general protection

### Enhanced Level (Default)
- Screenshots and screen recordings show black screen
- Subtle watermarks with rotation (optional)
- Screenshot detection and notification
- Recommended for medical applications

### Maximum Level
- All screen capture methods show black screen
- Additional security measures
- Maximum protection against all capture methods
- Suitable for highly sensitive content

## Usage Instructions

### 1. Installation

Install the required dependency:

```bash
npm install expo-screen-capture
```

### 2. Basic Integration

Add to your chat component:

```typescript
import { useScreenshotPrevention } from '../hooks/useScreenshotPrevention';
import SecurityWatermark from '../components/SecurityWatermark';

function ChatComponent() {
  const { isEnabled, config } = useScreenshotPrevention();
  
  return (
    <View>
      {/* Your chat content */}
      
      {/* Security watermark */}
      <SecurityWatermark 
        visible={isEnabled && config.showWatermark}
        text={config.watermarkText}
      />
    </View>
  );
}
```

### 3. Settings Integration

Add settings component:

```typescript
import ScreenshotPreventionSettings from '../components/ScreenshotPreventionSettings';

function SettingsScreen() {
  const [showSettings, setShowSettings] = useState(false);
  
  return (
    <View>
      <TouchableOpacity onPress={() => setShowSettings(true)}>
        <Text>Screenshot Prevention Settings</Text>
      </TouchableOpacity>
      
      <Modal visible={showSettings}>
        <ScreenshotPreventionSettings 
          visible={showSettings}
          onClose={() => setShowSettings(false)}
        />
      </Modal>
    </View>
  );
}
```

## Configuration Options

### ScreenshotPreventionConfig Interface

```typescript
interface ScreenshotPreventionConfig {
  enabled: boolean;                    // Enable/disable screenshot prevention
  showWatermark: boolean;             // Show watermark overlay
  watermarkText?: string;             // Custom watermark text
  notifyOnScreenshot: boolean;        // Notify on screenshot attempts (iOS)
  securityLevel: 'basic' | 'enhanced' | 'maximum'; // Security level
}
```

### Default Configuration

```typescript
const defaultConfig = {
  enabled: true,
  showWatermark: true,
  watermarkText: 'Doc Available - Confidential',
  notifyOnScreenshot: true,
  securityLevel: 'enhanced'
};
```

## Platform-Specific Notes

### iOS
- Screenshot prevention works on all iOS versions
- Screen recording is also blocked
- Screenshot detection is available but limited
- Watermark overlay works on all content

### Android
- FLAG_SECURE works on Android 4.0+ (API level 14+)
- Blocks both screenshots and screen recording
- Works with all Android versions
- Native implementation required

## Security Considerations

### Limitations
1. **Physical Access**: Cannot prevent physical camera photos of the screen
2. **Rooted/Jailbroken Devices**: May be bypassed on compromised devices
3. **Screen Recording Apps**: Some specialized apps may still capture content
4. **Accessibility Services**: May be bypassed by accessibility tools

### Best Practices
1. **Combine with Encryption**: Use alongside end-to-end encryption
2. **Regular Updates**: Keep security measures updated
3. **User Education**: Inform users about security features
4. **Audit Logging**: Log security events for monitoring
5. **Fallback Measures**: Implement additional security layers

## Troubleshooting

### Common Issues

1. **Screenshot Prevention Not Working**
   - Check if the service is properly initialized
   - Verify platform-specific implementation
   - Check for errors in console logs

2. **Watermark Not Showing**
   - Ensure `showWatermark` is enabled in config
   - Check if screenshot prevention is enabled
   - Verify component is properly rendered

3. **Android Build Issues**
   - Ensure native module is properly registered
   - Check MainApplication.kt configuration
   - Verify package registration

4. **iOS Permission Issues**
   - Check if expo-screen-capture is properly installed
   - Verify iOS permissions are granted
   - Check for Expo SDK compatibility

### Debug Mode

Enable debug logging:

```typescript
// In your app initialization
console.log('Screenshot prevention enabled:', screenshotPreventionService.isScreenshotPreventionEnabled());
console.log('Current config:', screenshotPreventionService.getConfig());
```

## Future Enhancements

### Planned Features
1. **Advanced Watermarking**: Dynamic watermarks with user identification
2. **Screenshot Analytics**: Track and analyze screenshot attempts
3. **Content Blurring**: Blur sensitive content in screenshots
4. **Biometric Integration**: Require biometric authentication for sensitive actions
5. **Server-Side Monitoring**: Send security events to backend

### Integration Opportunities
1. **HIPAA Compliance**: Enhanced medical data protection
2. **Audit Trails**: Comprehensive security logging
3. **User Training**: Built-in security education
4. **Compliance Reporting**: Generate security compliance reports

## Conclusion

The screenshot prevention implementation provides comprehensive protection for sensitive medical conversations in the Doc Available application. The multi-layered approach ensures that unauthorized content capture is prevented while maintaining a good user experience. The modular design allows for easy customization and future enhancements based on specific security requirements.
