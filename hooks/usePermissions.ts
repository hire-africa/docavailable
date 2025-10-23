import { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';
import PermissionManager, { PermissionInfo } from '../services/permissionManager';

export function usePermissions() {
  const [permissions, setPermissions] = useState<PermissionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasEssentialPermissions, setHasEssentialPermissions] = useState(false);

  const loadPermissions = useCallback(async () => {
    try {
      setLoading(true);
      const allPermissions = await PermissionManager.getAllPermissions();
      setPermissions(allPermissions);
      
      const essential = allPermissions.filter(p => p.required);
      const allEssentialGranted = essential.every(p => p.granted);
      setHasEssentialPermissions(allEssentialGranted);
    } catch (error) {
      console.error('Error loading permissions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const requestPermission = useCallback(async (permissionKey: string): Promise<boolean> => {
    try {
      const result = await PermissionManager.requestPermission(permissionKey);
      
      // Update local state
      setPermissions(prev => prev.map(p => 
        p.key === permissionKey 
          ? { ...p, granted: result.granted, canAskAgain: result.canAskAgain }
          : p
      ));

      // Update essential permissions status
      if (result.granted) {
        const updatedPermissions = permissions.map(p => 
          p.key === permissionKey 
            ? { ...p, granted: result.granted, canAskAgain: result.canAskAgain }
            : p
        );
        const essential = updatedPermissions.filter(p => p.required);
        const allEssentialGranted = essential.every(p => p.granted);
        setHasEssentialPermissions(allEssentialGranted);
      }

      return result.granted;
    } catch (error) {
      console.error('Error requesting permission:', error);
      return false;
    }
  }, [permissions]);

  const checkPermission = useCallback(async (permissionKey: string): Promise<boolean> => {
    try {
      const result = await PermissionManager.checkPermission(permissionKey);
      return result.granted;
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }, []);

  const requestPermissionWithExplanation = useCallback(async (permissionKey: string): Promise<boolean> => {
    const permission = permissions.find(p => p.key === permissionKey);
    if (!permission) return false;

    // Show explanation first
    const shouldRequest = await PermissionManager.showPermissionExplanation(permission);
    if (!shouldRequest) return false;

    // Request the permission
    const granted = await requestPermission(permissionKey);
    
    // If denied and can't ask again, show settings alert
    if (!granted && !permission.canAskAgain) {
      PermissionManager.showPermissionDeniedAlert(permission);
    }

    return granted;
  }, [permissions, requestPermission]);

  const requestMultiplePermissions = useCallback(async (permissionKeys: string[]): Promise<{ granted: string[]; denied: string[] }> => {
    const granted: string[] = [];
    const denied: string[] = [];

    for (const key of permissionKeys) {
      const result = await requestPermission(key);
      if (result) {
        granted.push(key);
      } else {
        denied.push(key);
      }
    }

    return { granted, denied };
  }, [requestPermission]);

  const openSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  const getPermission = useCallback((permissionKey: string): PermissionInfo | undefined => {
    return permissions.find(p => p.key === permissionKey);
  }, [permissions]);

  const isPermissionGranted = useCallback((permissionKey: string): boolean => {
    const permission = getPermission(permissionKey);
    return permission?.granted || false;
  }, [getPermission]);

  const getPermissionsByCategory = useCallback((category: string): PermissionInfo[] => {
    return permissions.filter(p => p.category === category);
  }, [permissions]);

  const getEssentialPermissions = useCallback((): PermissionInfo[] => {
    return permissions.filter(p => p.required);
  }, [permissions]);

  const getOptionalPermissions = useCallback((): PermissionInfo[] => {
    return permissions.filter(p => !p.required);
  }, [permissions]);

  const getPermissionSummary = useCallback(() => {
    return PermissionManager.getPermissionSummary(permissions);
  }, [permissions]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  return {
    permissions,
    loading,
    hasEssentialPermissions,
    loadPermissions,
    requestPermission,
    requestPermissionWithExplanation,
    requestMultiplePermissions,
    checkPermission,
    openSettings,
    getPermission,
    isPermissionGranted,
    getPermissionsByCategory,
    getEssentialPermissions,
    getOptionalPermissions,
    getPermissionSummary,
  };
}

// Hook for specific permission checks
export function usePermission(permissionKey: string) {
  const { 
    isPermissionGranted, 
    requestPermission, 
    requestPermissionWithExplanation,
    getPermission 
  } = usePermissions();

  const granted = isPermissionGranted(permissionKey);
  const permission = getPermission(permissionKey);

  const request = useCallback(() => {
    return requestPermission(permissionKey);
  }, [requestPermission, permissionKey]);

  const requestWithExplanation = useCallback(() => {
    return requestPermissionWithExplanation(permissionKey);
  }, [requestPermissionWithExplanation, permissionKey]);

  return {
    granted,
    permission,
    request,
    requestWithExplanation,
    canAskAgain: permission?.canAskAgain || false,
  };
}

// Hook for camera permission
export function useCameraPermission() {
  return usePermission('camera');
}

// Hook for microphone permission
export function useMicrophonePermission() {
  return usePermission('microphone');
}

// Hook for notification permission
export function useNotificationPermission() {
  return usePermission('notifications');
}

// Hook for location permission
export function useLocationPermission() {
  return usePermission('location');
}

// Hook for storage permission
export function useStoragePermission() {
  return usePermission('storage');
}

// Hook for phone permission
export function usePhonePermission() {
  return usePermission('phone');
}

// Hook for Bluetooth permission
export function useBluetoothPermission() {
  return usePermission('bluetooth');
}

// Hook for contacts permission
export function useContactsPermission() {
  return usePermission('contacts');
}

// Hook for calendar permission
export function useCalendarPermission() {
  return usePermission('calendar');
}

// Hook for media library permission
export function useMediaLibraryPermission() {
  return usePermission('media_library');
}
