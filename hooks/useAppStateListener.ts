import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import backgroundSessionTimer from '../services/backgroundSessionTimer';

export function useAppStateListener() {
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log('📱 [AppState] App state changed to:', nextAppState);
      
      if (nextAppState === 'background') {
        console.log('📱 [AppState] App went to background - timers continue running');
        // Background timers continue running automatically
      } else if (nextAppState === 'active') {
        console.log('📱 [AppState] App became active - checking timer states');
        // Clean up old sessions when app becomes active
        backgroundSessionTimer.cleanupOldSessions();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, []);
}
