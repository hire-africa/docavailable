import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/useColorScheme';

/**
 * Custom theme hook that respects user's theme preference from settings
 * Falls back to system color scheme if no user preference is set
 */
export function useCustomTheme() {
  const systemColorScheme = useColorScheme();
  const { userData } = useAuth();
  
  // Get theme from user data preferences
  const userTheme = userData?.preferences?.theme;
  
  // If user has a theme preference, use it; otherwise use system theme
  const theme = userTheme || systemColorScheme || 'light';
  
  // Debug logging
  console.log('🎨 [useCustomTheme] Debug:', {
    userTheme,
    systemColorScheme,
    finalTheme: theme,
    userData: userData ? 'present' : 'null',
    preferences: userData?.preferences,
    anonymousMode: userData?.privacy?.anonymousMode,
    fullUserData: userData
  });
  
  return {
    theme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    isSystem: !userTheme, // Whether using system theme
  };
}
