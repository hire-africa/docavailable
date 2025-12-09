# Testing Dark Mode

## 🧪 How to Test

### Method 1: Enable Anonymous Mode (Production Way)
1. Log in as a patient
2. Go to Settings
3. Find "Anonymous Consultation" toggle
4. Turn it ON
5. App should immediately switch to purple-ish dark mode

### Method 2: Manual Theme Toggle (Testing)
Add this to any screen temporarily to test theme switching:

```typescript
import { useTheme } from '@/contexts/ThemeContext';

function TestThemeButton() {
  const { theme, toggleTheme, isAnonymousMode } = useTheme();
  
  return (
    <TouchableOpacity 
      onPress={toggleTheme}
      style={{ 
        padding: 20, 
        backgroundColor: theme === 'dark' ? '#66BB6A' : '#4CAF50',
        margin: 20 
      }}
    >
      <Text style={{ color: '#fff', fontSize: 16 }}>
        Current: {theme}
        {isAnonymousMode && ' (Anonymous Mode)'}
        {'\n'}
        Tap to toggle
      </Text>
    </TouchableOpacity>
  );
}
```

### Method 3: Force Dark Mode (Quick Test)
Temporarily change `ThemeContext.tsx`:

```typescript
// Line 30 - Change this:
const theme = isAnonymousMode ? 'dark' : manualTheme;

// To this (forces dark):
const theme = 'dark'; // TEST ONLY - REMOVE AFTER TESTING
```

## 📱 What to Check

### Console Logs
Look for these in your console:
```
🎨 [ThemeProvider] Current state: {
  isAnonymousMode: false,
  manualTheme: 'light',
  finalTheme: 'light',
  userData: 'present'
}
```

### Visual Indicators
When dark mode is active, you should see:
- **Background**: Deep purple (`#1A1625`)
- **Text**: Soft lavender (`#E8E6F0`)
- **Cards**: Purple (`#251E35`)

### Screens Already Refactored
These screens should show dark mode:
- ✅ `login.tsx` - Background should be purple
- ✅ `signup.tsx` - Background and cards should be purple

### Screens NOT Refactored Yet
These will still show hardcoded colors (won't change):
- ❌ `patient-dashboard.tsx` - Still has hardcoded colors
- ❌ Most other screens

## 🔍 Troubleshooting

### Dark mode not showing?

**Check 1: Is anonymous mode actually enabled?**
```typescript
// Look in console for:
isAnonymousMode: true  // Should be true
finalTheme: 'dark'     // Should be dark
```

**Check 2: Are you on a refactored screen?**
- Only `login.tsx` and `signup.tsx` are refactored
- Other screens still have hardcoded colors

**Check 3: Is the screen using useThemedColors?**
```typescript
// Screen should have:
import { useThemedColors } from '@/hooks/useThemedColors';
const colors = useThemedColors();
// And use colors.background, colors.text, etc.
```

**Check 4: Check the console logs**
```
🎨 [ThemeProvider] Current state: {...}
```
This tells you what theme is active.

## 🎯 Quick Test Script

Add this to `signup.tsx` temporarily at the top of the component:

```typescript
export default function Signup() {
  const colors = useThemedColors();
  const { theme, isAnonymousMode } = useTheme();
  
  // TEMPORARY TEST - REMOVE AFTER
  console.log('🧪 SIGNUP THEME TEST:', {
    theme,
    isAnonymousMode,
    backgroundColor: colors.background,
    textColor: colors.text
  });
  
  // Rest of component...
}
```

Then check the console - you should see the colors being used.

## ✅ Expected Results

### Light Mode (Default)
- Background: `#FFFFFF` (white)
- Text: `#11181C` (dark gray)
- Cards: `#FFFFFF` (white)

### Dark Mode (Anonymous or Manual)
- Background: `#1A1625` (deep purple)
- Text: `#E8E6F0` (soft lavender)
- Cards: `#251E35` (purple)

## 🚀 Next Steps

1. Check console logs to see current theme state
2. Try toggling anonymous mode in patient settings
3. If still not working, add the test button to see theme switching
4. Once working, continue refactoring other screens
