import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import PermissionManager from '../services/permissionManager';
import PermissionRequestScreen from './PermissionRequestScreen';

interface PermissionWrapperProps {
  children: React.ReactNode;
  onPermissionComplete?: (allEssentialGranted: boolean) => void;
}

export default function PermissionWrapper({ children, onPermissionComplete }: PermissionWrapperProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [showPermissionScreen, setShowPermissionScreen] = useState(false);
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);

  useEffect(() => {
    checkPermissionStatus();
  }, []);

  const checkPermissionStatus = async () => {
    try {
      setIsLoading(true);
      
      // Check if this is the first launch
      const firstLaunch = await PermissionManager.isFirstLaunch();
      setIsFirstLaunch(firstLaunch);

      if (firstLaunch) {
        // First launch - show permission screen
        setShowPermissionScreen(true);
      } else {
        // Not first launch - check if essential permissions are granted
        const hasEssential = await PermissionManager.hasEssentialPermissions();
        if (!hasEssential) {
          // Some essential permissions are missing - show permission screen
          setShowPermissionScreen(true);
        } else {
          // All essential permissions granted - show main app
          setShowPermissionScreen(false);
        }
      }
    } catch (error) {
      console.error('Error checking permission status:', error);
      // On error, show main app
      setShowPermissionScreen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePermissionComplete = async (allEssentialGranted: boolean) => {
    try {
      // Mark app as launched
      await PermissionManager.markAsLaunched();
      
      // Hide permission screen
      setShowPermissionScreen(false);
      
      // Notify parent component
      onPermissionComplete?.(allEssentialGranted);
    } catch (error) {
      console.error('Error handling permission completion:', error);
      setShowPermissionScreen(false);
    }
  };

  const handleSkip = () => {
    setShowPermissionScreen(false);
    onPermissionComplete?.(false);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (showPermissionScreen) {
    return (
      <PermissionRequestScreen
        onComplete={handlePermissionComplete}
        onSkip={handleSkip}
      />
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
});
