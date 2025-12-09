import { useAuth } from '@/contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  isAnonymousMode: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@docavailable_theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { userData, loading: authLoading } = useAuth();
  const [manualTheme, setManualTheme] = useState<ThemeMode>('light');
  const [isLoading, setIsLoading] = useState(true);

  // Check if anonymous mode is enabled
  // This will be set through the privacy settings
  const isAnonymousMode = userData?.privacy_settings?.privacy?.anonymousConsultation || 
                         userData?.privacy?.anonymousConsultation || false;

  // TEMPORARY: Force dark mode for testing - REMOVE THIS AFTER TESTING
  const forceDarkMode = false; // SET TO FALSE TO DISABLE

  // Determine actual theme: anonymous mode forces dark, otherwise use manual theme
  const theme = (isAnonymousMode || forceDarkMode) ? 'dark' : manualTheme;

  // Debug logging
  console.log('🎨 [ThemeProvider] Current state:', {
    isAnonymousMode,
    manualTheme,
    finalTheme: theme,
    userData: userData ? 'present' : 'null',
    authLoading,
  });

  // Load saved theme on mount
  useEffect(() => {
    loadSavedTheme();
  }, []);

  const loadSavedTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setManualTheme(savedTheme);
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setTheme = async (newTheme: ThemeMode) => {
    try {
      setManualTheme(newTheme);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
      console.log('🎨 Manual theme changed to:', newTheme);
      console.log('🎨 Actual theme (considering anonymous mode):', isAnonymousMode ? 'dark (forced)' : newTheme);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  const toggleTheme = () => {
    // Only toggle if not in anonymous mode
    if (isAnonymousMode) {
      console.log('🎨 Cannot toggle theme while in anonymous mode (dark mode is forced)');
      return;
    }
    const newTheme = manualTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  const value: ThemeContextType = {
    theme,
    isDark: theme === 'dark',
    toggleTheme,
    setTheme,
    isAnonymousMode,
  };

  // Don't render children until both theme and auth are loaded
  // This prevents the flash when anonymous mode data loads
  if (isLoading || authLoading) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
