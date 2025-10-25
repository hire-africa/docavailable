import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/useColorScheme';

/**
 * Custom theme hook that respects user's theme preference from settings
 * Uses custom theme system instead of system color scheme
 */
export function useCustomTheme() {
  const systemColorScheme = useColorScheme();
  const { userData } = useAuth();
  
  // Get theme from user data preferences
  const userTheme = userData?.preferences?.theme;
  
  // Check if anonymous mode is enabled (this should trigger dark mode)
  const isAnonymousMode = userData?.privacy_preferences?.privacy?.anonymousMode || 
                         userData?.anonymousMode || 
                         userData?.preferences?.anonymousMode || false;
  
  // If anonymous mode is enabled, force dark theme
  // Otherwise use user theme preference or default to light
  const theme = isAnonymousMode ? 'dark' : (userTheme || 'light');
  
  // Debug logging
  console.log('🎨 [useCustomTheme] Debug:', {
    userTheme,
    systemColorScheme,
    finalTheme: theme,
    isAnonymousMode,
    userData: userData ? 'present' : 'null',
    preferences: userData?.preferences,
    userDataKeys: userData ? Object.keys(userData) : [],
    hasPreferences: !!userData?.preferences,
    privacyPreferences: userData?.privacy_preferences,
    preferencesValue: userData?.preferences,
    privacyPreferencesValue: userData?.privacy_preferences,
    note: 'Using custom theme system - anonymous mode forces dark theme'
  });
  
  return {
    theme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    isSystem: false, // We're always using our custom theme system
  };
}
