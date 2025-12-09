# Custom Alert System Implementation Guide

## Overview
This guide explains how to replace all React Native `Alert.alert()` calls with a custom, beautifully styled alert system throughout your app.

## 🎯 What You Get

- ✅ **Beautiful UI**: Modern, animated alerts with icons
- ✅ **Type-specific styling**: Success (green), Error (red), Warning (orange), Info (blue)
- ✅ **Multiple button support**: Single button, two buttons, or multiple buttons
- ✅ **Drop-in replacement**: Minimal code changes required
- ✅ **Consistent UX**: All alerts look the same across the app
- ✅ **Animation**: Smooth fade-in and scale animations

## 📁 Files Created

1. **`services/customAlertService.tsx`** - Core service that manages alert state
2. **`components/CustomAlertDialog.tsx`** - Enhanced alert dialog component with button support
3. **`components/CustomAlertProvider.tsx`** - Provider component that wraps your app
4. **`utils/customAlert.ts`** - Drop-in replacement utility for Alert.alert()

## 🚀 Setup Instructions

### Step 1: Add Provider to Your App Layout

Open `app/_layout.tsx` and wrap your app with `CustomAlertProvider`:

```tsx
import CustomAlertProvider from '../components/CustomAlertProvider';

export default function RootLayout() {
  return (
    <CustomAlertProvider>
      {/* Your existing app content */}
      <Stack>
        <Stack.Screen name="index" />
        {/* ... other screens */}
      </Stack>
    </CustomAlertProvider>
  );
}
```

### Step 2: Replace Alert Imports

**Before:**
```tsx
import { Alert } from 'react-native';
```

**After:**
```tsx
import { Alert } from '../utils/customAlert';
```

That's it! Your existing `Alert.alert()` calls will now use the custom alert system.

## 📖 Usage Examples

### Basic Alert (No Changes Needed!)
```tsx
// Your existing code works as-is
Alert.alert('Success', 'Operation completed successfully');
```

### Alert with Buttons (No Changes Needed!)
```tsx
Alert.alert(
  'Confirm Action',
  'Are you sure you want to continue?',
  [
    { text: 'Cancel', onPress: () => console.log('Cancelled') },
    { text: 'OK', onPress: () => console.log('OK Pressed') }
  ]
);
```

### Typed Alerts (New Feature!)
```tsx
// Success alert (green)
Alert.success('Success!', 'Your profile has been updated');

// Error alert (red)
Alert.error('Error', 'Failed to save changes');

// Warning alert (orange)
Alert.warning('Warning', 'This action cannot be undone');

// Info alert (blue)
Alert.info('Info', 'Please check your email');

// Confirmation dialog
Alert.confirm(
  'Delete Account',
  'Are you sure you want to delete your account?',
  () => console.log('Confirmed'),
  () => console.log('Cancelled'),
  'Delete', // Confirm button text
  'Cancel'  // Cancel button text
);
```

### Advanced: Specify Alert Type
```tsx
Alert.alert(
  'Success',
  'Operation completed',
  [{ text: 'OK' }],
  { type: 'success' } // 'success' | 'error' | 'warning' | 'info' | 'confirm'
);
```

## 🎨 Alert Types & Colors

| Type | Icon | Color | Use Case |
|------|------|-------|----------|
| **success** | ✓ Check Circle | Green (#4CAF50) | Successful operations |
| **error** | ✗ Times Circle | Red (#FF3B30) | Errors and failures |
| **warning** | ⚠ Triangle | Orange (#FF9500) | Warnings and cautions |
| **info** | ℹ Info Circle | Blue (#007AFF) | Information messages |
| **confirm** | ? Question Circle | Blue (#007AFF) | Confirmation dialogs |

## 🔄 Migration Strategy

### Option 1: Gradual Migration (Recommended)
Migrate files one at a time as you work on them:

1. Add provider to `_layout.tsx` ✅
2. Replace imports in files you're actively working on
3. Test thoroughly
4. Continue with other files

### Option 2: Bulk Migration
Use find-and-replace across your project:

**Find:**
```
import { Alert } from 'react-native';
```

**Replace with:**
```
import { Alert } from '../utils/customAlert';
```

**Note:** Adjust the path (`../utils/customAlert`) based on file location.

## 📝 Button Styles

The custom alert supports three button styles:

```tsx
Alert.alert('Title', 'Message', [
  { 
    text: 'Cancel', 
    style: 'cancel',      // Gray background
    onPress: () => {} 
  },
  { 
    text: 'Delete', 
    style: 'destructive', // Red background
    onPress: () => {} 
  },
  { 
    text: 'OK', 
    style: 'default',     // Colored background (matches alert type)
    onPress: () => {} 
  }
]);
```

## 🎭 Button Layouts

### Single Button
Full-width button with colored background:
```tsx
Alert.alert('Title', 'Message', [
  { text: 'OK' }
]);
```

### Two Buttons
Side-by-side buttons:
```tsx
Alert.alert('Title', 'Message', [
  { text: 'Cancel', style: 'cancel' },
  { text: 'OK' }
]);
```

### Multiple Buttons
Stacked buttons:
```tsx
Alert.alert('Title', 'Message', [
  { text: 'Option 1' },
  { text: 'Option 2' },
  { text: 'Cancel', style: 'cancel' }
]);
```

## 🔧 Customization

### Modify Colors
Edit `components/CustomAlertDialog.tsx` in the `getIconAndColors()` function:

```tsx
case 'success':
  return {
    icon: 'check-circle' as const,
    iconColor: '#YOUR_COLOR',        // Change icon color
    backgroundColor: '#YOUR_BG',      // Change icon background
    borderColor: '#YOUR_BORDER'       // Change dialog border
  };
```

### Modify Animation
Edit animation settings in `CustomAlertDialog.tsx`:

```tsx
Animated.timing(fadeAnim, {
  toValue: 1,
  duration: 200,  // Change duration
  useNativeDriver: true,
})
```

## 🐛 Troubleshooting

### Alert not showing
- Ensure `CustomAlertProvider` is added to `_layout.tsx`
- Check that it wraps all your screens
- Verify import path is correct

### Buttons not working
- Ensure `onPress` callbacks are defined
- Check console for errors
- Verify button array is properly formatted

### Wrong colors
- Check the `type` parameter matches your intent
- Verify you're using the correct alert method (`.success()`, `.error()`, etc.)

## 📊 Migration Checklist

- [ ] Add `CustomAlertProvider` to `_layout.tsx`
- [ ] Test with a simple alert in one file
- [ ] Replace imports in high-priority files
- [ ] Test all alert types (success, error, warning, info)
- [ ] Test button interactions
- [ ] Test on both iOS and Android
- [ ] Update remaining files
- [ ] Remove old `AlertDialog.tsx` if no longer needed

## 🎉 Benefits

1. **Consistent UX**: All alerts look the same across your app
2. **Better Branding**: Customize colors to match your brand
3. **Improved Accessibility**: Larger touch targets, better contrast
4. **Enhanced Feedback**: Visual cues with icons and colors
5. **Smooth Animations**: Professional feel with fade and scale effects
6. **Easy Maintenance**: Change alert style in one place

## 📚 Examples from Your Codebase

### Before (AudioCall.tsx)
```tsx
import { Alert } from 'react-native';

Alert.alert('Call Error', error);
Alert.alert('Call Failed', 'Unable to start audio call. Please try again.', [
  { text: 'OK', onPress: onEndCall }
]);
```

### After
```tsx
import { Alert } from '../utils/customAlert';

Alert.error('Call Error', error);
Alert.error('Call Failed', 'Unable to start audio call. Please try again.', onEndCall);
```

### Before (chat/[appointmentId].tsx)
```tsx
Alert.alert('Error', 'Failed to end session. Please try again.');
Alert.alert(
  'Thank You!',
  'Your rating has been submitted successfully.',
  [{ text: 'OK', onPress: () => router.back() }]
);
```

### After
```tsx
Alert.error('Error', 'Failed to end session. Please try again.');
Alert.success(
  'Thank You!',
  'Your rating has been submitted successfully.',
  () => router.back()
);
```

## 🚀 Next Steps

1. Add the provider to your app layout
2. Test with one file to ensure it works
3. Gradually migrate other files
4. Enjoy consistent, beautiful alerts throughout your app!

---

**Need Help?** Check the example files or refer to this documentation.
