# Anonymous Mode & Dark Theme Integration

## 🔒 How It Works

The theme system is now **fully integrated with Anonymous Mode**:

### Automatic Dark Mode
When a patient enables **Anonymous Consultation** in their settings:
- ✅ App **automatically switches to dark mode**
- ✅ Dark mode is **forced** (cannot be toggled off while anonymous)
- ✅ Purple-ish dark theme provides privacy-focused UI
- ✅ When anonymous mode is disabled, returns to user's preferred theme

### No System Theme Dependency
- ❌ **Does NOT use device system theme**
- ✅ **Only responds to:**
  1. Anonymous mode toggle (forces dark)
  2. Manual theme selection (when not anonymous)
  3. Saved theme preference from AsyncStorage

## 🎯 User Experience Flow

### Scenario 1: Anonymous Mode ON
```
User enables Anonymous Consultation
    ↓
App detects: isAnonymousMode = true
    ↓
Theme forced to: DARK (purple-ish)
    ↓
Theme toggle disabled (shows message if attempted)
    ↓
User sees: Beautiful purple dark mode
```

### Scenario 2: Anonymous Mode OFF
```
User disables Anonymous Consultation
    ↓
App detects: isAnonymousMode = false
    ↓
Theme returns to: User's saved preference (light/dark)
    ↓
Theme toggle enabled
    ↓
User can manually switch themes
```

### Scenario 3: First Time User
```
New user (no saved preference)
    ↓
Default theme: LIGHT
    ↓
If they enable anonymous mode: DARK
    ↓
If they manually switch theme: Saved to AsyncStorage
```

## 🔧 Technical Implementation

### ThemeContext Logic
```typescript
// Check anonymous mode from user data
const isAnonymousMode = 
  userData?.privacy_preferences?.privacy?.anonymousMode || 
  userData?.anonymousMode || 
  userData?.preferences?.anonymousMode || false;

// Force dark if anonymous, otherwise use manual preference
const theme = isAnonymousMode ? 'dark' : manualTheme;
```

### Theme Toggle Behavior
```typescript
const toggleTheme = () => {
  if (isAnonymousMode) {
    console.log('Cannot toggle theme while in anonymous mode');
    return; // Prevents toggle
  }
  // Normal toggle logic
};
```

## 📍 Where Anonymous Mode is Checked

The system checks for anonymous mode in **multiple locations** for reliability:

1. `userData?.privacy_preferences?.privacy?.anonymousMode`
2. `userData?.anonymousMode`
3. `userData?.preferences?.anonymousMode`

This ensures it works regardless of where the setting is stored.

## 🎨 Visual Indicators (Optional)

You can show users when dark mode is forced:

```typescript
import { useTheme } from '@/contexts/ThemeContext';

function ThemeSettings() {
  const { isDark, isAnonymousMode, toggleTheme } = useTheme();
  
  return (
    <View>
      {isAnonymousMode && (
        <Text style={{ color: colors.warning }}>
          🔒 Dark mode is active due to Anonymous Consultation
        </Text>
      )}
      
      <TouchableOpacity 
        onPress={toggleTheme}
        disabled={isAnonymousMode}
      >
        <Text>
          {isAnonymousMode 
            ? 'Theme locked (Anonymous Mode active)'
            : `Switch to ${isDark ? 'Light' : 'Dark'} Mode`
          }
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

## 🔄 State Transitions

### When User Toggles Anonymous Mode

**Enabling Anonymous Mode:**
```
Settings: Anonymous ON
    ↓
userData updates
    ↓
ThemeContext detects change
    ↓
theme = 'dark' (forced)
    ↓
All components re-render with dark colors
    ↓
Purple-ish dark UI appears
```

**Disabling Anonymous Mode:**
```
Settings: Anonymous OFF
    ↓
userData updates
    ↓
ThemeContext detects change
    ↓
theme = manualTheme (e.g., 'light')
    ↓
All components re-render with light colors
    ↓
Original theme restored
```

## 💾 Persistence

### What Gets Saved
- ✅ **Manual theme preference** → AsyncStorage (`@docavailable_theme`)
- ✅ **Anonymous mode setting** → User data in database

### What Doesn't Get Saved
- ❌ Forced dark mode state (it's derived from anonymous mode)
- ❌ System theme preference (we don't use it)

### On App Restart
```
App launches
    ↓
Load saved manual theme from AsyncStorage
    ↓
Load user data (includes anonymous mode setting)
    ↓
Calculate actual theme:
  - If anonymous mode: dark
  - Otherwise: saved manual theme
    ↓
Render with correct theme
```

## 🧪 Testing Checklist

- [ ] Enable anonymous mode → App switches to dark
- [ ] Disable anonymous mode → App returns to previous theme
- [ ] Try to toggle theme while anonymous → Blocked
- [ ] Manually set dark theme → Works when not anonymous
- [ ] Manually set light theme → Works when not anonymous
- [ ] Restart app with anonymous ON → Still dark
- [ ] Restart app with anonymous OFF → Correct theme restored
- [ ] Check console logs for theme changes

## 📝 Console Logs

You'll see helpful logs:
```
🎨 Manual theme changed to: light
🎨 Actual theme (considering anonymous mode): dark (forced)
```

Or:
```
🎨 Cannot toggle theme while in anonymous mode (dark mode is forced)
```

## 🎯 Key Benefits

1. **Privacy-First**: Anonymous mode automatically provides dark UI
2. **User Control**: When not anonymous, users control their theme
3. **No Surprises**: Theme behavior is predictable and consistent
4. **Persistence**: Preferences are saved and restored
5. **No System Dependency**: Works independently of device settings

## 🔐 Privacy Considerations

The purple-ish dark theme for anonymous mode:
- Reduces screen brightness (less visible to others)
- Provides visual confirmation of privacy mode
- Creates distinct "private browsing" feel
- Easier on eyes during sensitive consultations

---

**Summary**: Anonymous mode = automatic dark mode. Simple, secure, and user-friendly! 🌙🔒
