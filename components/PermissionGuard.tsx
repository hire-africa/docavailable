import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { usePermission } from '../hooks/usePermissions';

interface PermissionGuardProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showRequestButton?: boolean;
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
}

export default function PermissionGuard({
  permission,
  children,
  fallback,
  showRequestButton = true,
  onPermissionGranted,
  onPermissionDenied,
}: PermissionGuardProps) {
  const { granted, requestWithExplanation, canAskAgain, permission: permissionInfo } = usePermission(permission);

  const handleRequestPermission = async () => {
    const result = await requestWithExplanation();
    if (result) {
      onPermissionGranted?.();
    } else {
      onPermissionDenied?.();
    }
  };

  if (granted) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons 
          name={getPermissionIcon(permission)} 
          size={48} 
          color="#FF6B6B" 
        />
      </View>
      <Text style={styles.title}>Permission Required</Text>
      <Text style={styles.description}>
        {permissionInfo?.description || 'This feature requires a permission to work properly.'}
      </Text>
      {showRequestButton && canAskAgain && (
        <TouchableOpacity 
          style={styles.requestButton}
          onPress={handleRequestPermission}
        >
          <Text style={styles.requestButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      )}
      {!canAskAgain && (
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => {
            // This would typically open settings
            console.log('Open settings');
          }}
        >
          <Text style={styles.settingsButtonText}>Open Settings</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function getPermissionIcon(permission: string): keyof typeof Ionicons.glyphMap {
  const iconMap: { [key: string]: keyof typeof Ionicons.glyphMap } = {
    camera: 'camera-outline',
    microphone: 'mic-outline',
    notifications: 'notifications-outline',
    storage: 'folder-outline',
    phone: 'call-outline',
    bluetooth: 'bluetooth-outline',
    location: 'location-outline',
    media_library: 'images-outline',
    contacts: 'people-outline',
    calendar: 'calendar-outline',
  };
  return iconMap[permission] || 'lock-closed-outline';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8F9FA',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#6C757D',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  requestButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  requestButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  settingsButton: {
    backgroundColor: '#6C757D',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  settingsButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
