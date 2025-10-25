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
  
  // Always use our custom theme system - don't fall back to system theme
  // If no user preference is set, default to 'light'
  const theme = userTheme || 'light';
  
  // Debug logging
  console.log('🎨 [useCustomTheme] Debug:', {
    userTheme,
    systemColorScheme,
    finalTheme: theme,
    userData: userData ? 'present' : 'null',
    preferences: userData?.preferences,
    anonymousMode: userData?.privacy?.anonymousMode,
    fullUserData: userData,
    note: 'Using custom theme system - not falling back to system theme'
  });
  
  return {
    theme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    isSystem: false, // We're always using our custom theme system
  };
}
