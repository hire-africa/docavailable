# Dark Theme Implementation Guide

## ✅ Infrastructure Complete

### What's Been Set Up

1. **ThemeContext** (`contexts/ThemeContext.tsx`)
   - Manages theme state (light/dark)
   - **Integrates with Anonymous Mode** (forces dark when enabled)
   - **NO system theme dependency** (custom theme only)
   - Persists theme preference to AsyncStorage
   - Provides `useTheme()` hook

2. **Expanded Colors Palette** (`constants/Colors.ts`)
   - Complete light/dark color definitions
   - 40+ semantic color tokens
   - Backward compatibility for legacy code

3. **useThemedColors Hook** (`hooks/useThemedColors.ts`)
   - Simple hook to get current theme colors
   - Returns complete color palette

4. **ThemeProvider Integration** (`app/_layout.tsx`)
   - Wraps entire app
   - Theme loads before app renders

## 🎨 How to Use in Components

### Basic Usage

```typescript
import { useThemedColors } from '@/hooks/useThemedColors';
import { useTheme } from '@/contexts/ThemeContext';

function MyComponent() {
  const colors = useThemedColors();
  const { isDark, toggleTheme, isAnonymousMode } = useTheme();
  
  return (
    <View style={{ backgroundColor: colors.background }}>
      <Text style={{ color: colors.text }}>Hello World</Text>
      
      {/* Theme toggle - disabled when anonymous mode is active */}
      <TouchableOpacity 
        onPress={toggleTheme}
        disabled={isAnonymousMode}
      >
        <Text style={{ color: colors.primary }}>
          {isAnonymousMode 
            ? '🔒 Dark mode (Anonymous)' 
            : `Switch to ${isDark ? 'Light' : 'Dark'} Mode`
          }
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

### Anonymous Mode Integration

The theme **automatically switches to dark** when Anonymous Consultation is enabled:

```typescript
// When user enables anonymous mode in settings:
// ✅ Theme automatically becomes 'dark'
// ✅ Toggle is disabled (dark mode is forced)
// ✅ Purple-ish dark UI appears

// When user disables anonymous mode:
// ✅ Theme returns to user's saved preference
// ✅ Toggle is re-enabled
```

See `ANONYMOUS_MODE_THEME.md` for complete details.

### Available Color Tokens

#### Base Colors
- `text` - Primary text color
- `textSecondary` - Secondary text (less emphasis)
- `textTertiary` - Tertiary text (least emphasis)
- `background` - Main background
- `backgroundSecondary` - Secondary background (cards, sections)
- `backgroundTertiary` - Tertiary background (nested elements)

#### Brand Colors
- `primary` - Primary brand color (#4CAF50 light, #66BB6A dark)
- `primaryLight` - Lighter variant
- `primaryDark` - Darker variant
- `success` - Success state
- `error` - Error state
- `warning` - Warning state
- `info` - Info state

#### UI Elements
- `border` - Border color
- `borderLight` - Lighter border
- `divider` - Divider lines
- `shadow` - Shadow color
- `overlay` - Modal/overlay background

#### Cards & Surfaces
- `card` - Card background
- `cardElevated` - Elevated card background
- `surface` - Surface background

#### Interactive Elements
- `buttonPrimary` - Primary button background
- `buttonSecondary` - Secondary button background
- `buttonDisabled` - Disabled button background
- `buttonText` - Primary button text
- `buttonTextSecondary` - Secondary button text

#### Input Fields
- `input` - Input background
- `inputBorder` - Input border
- `inputPlaceholder` - Placeholder text
- `inputFocused` - Focused input border

#### Status Colors
- `online` - Online status
- `offline` - Offline status
- `busy` - Busy status

#### Chat Specific
- `chatBubbleSent` - Sent message bubble
- `chatBubbleReceived` - Received message bubble
- `chatTextSent` - Sent message text
- `chatTextReceived` - Received message text

#### Special
- `white` - Always white
- `black` - Always black
- `transparent` - Transparent

## 📝 Migration Pattern

### Before (Hardcoded)
```typescript
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
  },
  text: {
    color: '#333333',
  },
  button: {
    backgroundColor: '#4CAF50',
  },
});
```

### After (Theme-Aware)
```typescript
function MyComponent() {
  const colors = useThemedColors();
  
  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.background,
    },
    text: {
      color: colors.text,
    },
    button: {
      backgroundColor: colors.primary,
    },
  });
  
  return <View style={styles.container}>...</View>;
}
```

**Important:** Move StyleSheet.create() inside the component so it recreates when theme changes!

## 🔄 Migration Status

### ✅ Completed
- Theme infrastructure
- Color palette
- Hooks and context
- App-level integration

### 🚧 In Progress
- Login/signup screens
- Patient dashboard
- Chat interface

### ⏳ Pending (157+ files)
- All other screens and components

## 🎯 Next Steps for Developers

1. **Pick a screen to refactor**
2. **Import the hook**: `import { useThemedColors } from '@/hooks/useThemedColors';`
3. **Get colors**: `const colors = useThemedColors();`
4. **Move styles inside component**: StyleSheet must recreate on theme change
5. **Replace hardcoded colors**: Use semantic tokens from `colors`
6. **Test both themes**: Toggle theme and verify appearance

## 🐛 Known Issues

- `InstantSessionTimer.tsx` still uses old flat Colors structure (will be fixed)
- Some notification permission types have TypeScript errors (unrelated to theme)

## 💡 Tips

- Use semantic names (`colors.text`) not specific colors (`colors.black`)
- Test in both light and dark mode
- Consider contrast ratios for accessibility
- Use `colors.white` and `colors.black` only when you truly need those exact colors

## 🔧 Adding New Colors

If you need a new color token:

1. Add it to both `light` and `dark` in `constants/Colors.ts`
2. Use semantic naming (what it's for, not what color it is)
3. Ensure good contrast in both themes

Example:
```typescript
// In Colors.ts
light: {
  // ... other colors
  cardHighlight: '#E8F5E9',
},
dark: {
  // ... other colors
  cardHighlight: '#1B5E20',
}
```
