import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PermissionManager, { PermissionInfo } from '../services/permissionManager';

interface PermissionRequestScreenProps {
  onComplete: (allEssentialGranted: boolean) => void;
  onSkip?: () => void;
}

export default function PermissionRequestScreen({ onComplete, onSkip }: PermissionRequestScreenProps) {
  const [permissions, setPermissions] = useState<PermissionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'essential' | 'optional'>('essential');

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      const allPermissions = await PermissionManager.getAllPermissions();
      setPermissions(allPermissions);
    } catch (error) {
      console.error('Error loading permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPermission = async (permission: PermissionInfo) => {
    if (requesting) return;

    try {
      setRequesting(permission.key);
      
      // Show explanation first
      const shouldRequest = await PermissionManager.showPermissionExplanation(permission);
      if (!shouldRequest) {
        setRequesting(null);
        return;
      }

      // Request the permission
      const result = await PermissionManager.requestPermission(permission.key);
      
      // Update permission status
      const updatedPermissions = permissions.map(p => 
        p.key === permission.key 
          ? { ...p, granted: result.granted, canAskAgain: result.canAskAgain }
          : p
      );
      setPermissions(updatedPermissions);

      // If permission was denied and can't ask again, show settings alert
      if (!result.granted && !result.canAskAgain) {
        PermissionManager.showPermissionDeniedAlert(permission);
      }

    } catch (error) {
      console.error('Error requesting permission:', error);
      Alert.alert('Error', 'Failed to request permission. Please try again.');
    } finally {
      setRequesting(null);
    }
  };

  const handleRequestAllEssential = async () => {
    try {
      setRequesting('all-essential');
      const result = await PermissionManager.requestEssentialPermissions();
      
      // Update permissions
      const updatedPermissions = permissions.map(p => ({
        ...p,
        granted: result.granted.includes(p.key) || p.granted,
      }));
      setPermissions(updatedPermissions);

      // Check if all essential permissions are granted
      const essentialPermissions = updatedPermissions.filter(p => p.required);
      const allEssentialGranted = essentialPermissions.every(p => p.granted);

      if (allEssentialGranted) {
        onComplete(true);
      } else {
        Alert.alert(
          'Some Permissions Required',
          'Some essential permissions were not granted. You can enable them later in settings.',
          [
            { text: 'Continue Anyway', onPress: () => onComplete(false) },
            { text: 'Try Again', onPress: () => loadPermissions() },
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting essential permissions:', error);
      Alert.alert('Error', 'Failed to request permissions. Please try again.');
    } finally {
      setRequesting(null);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Permissions?',
      'Some features may not work properly without these permissions. You can enable them later in settings.',
      [
        { text: 'Go Back', style: 'cancel' },
        { text: 'Skip', onPress: () => onComplete(false) },
      ]
    );
  };

  const getPermissionIcon = (permission: PermissionInfo) => {
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
    return iconMap[permission.key] || 'help-outline';
  };

  const getCategoryColor = (category: string) => {
    const colorMap: { [key: string]: string } = {
      essential: '#FF6B6B',
      call: '#4ECDC4',
      location: '#45B7D1',
      media: '#96CEB4',
      contacts: '#FFEAA7',
    };
    return colorMap[category] || '#DDA0DD';
  };

  const essentialPermissions = permissions.filter(p => p.required);
  const optionalPermissions = permissions.filter(p => !p.required);
  const summary = PermissionManager.getPermissionSummary(permissions);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading permissions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark" size={48} color="#4CAF50" />
          </View>
          <Text style={styles.title}>App Permissions</Text>
          <Text style={styles.subtitle}>
            To provide the best experience, we need some permissions. 
            You can change these later in settings.
          </Text>
        </View>

        {/* Progress */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${(summary.essentialGranted / summary.essentialTotal) * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {summary.essentialGranted} of {summary.essentialTotal} essential permissions granted
          </Text>
        </View>

        {/* Step Toggle */}
        <View style={styles.stepToggle}>
          <TouchableOpacity
            style={[
              styles.stepButton,
              currentStep === 'essential' && styles.stepButtonActive
            ]}
            onPress={() => setCurrentStep('essential')}
          >
            <Text style={[
              styles.stepButtonText,
              currentStep === 'essential' && styles.stepButtonTextActive
            ]}>
              Essential ({summary.essentialGranted}/{summary.essentialTotal})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.stepButton,
              currentStep === 'optional' && styles.stepButtonActive
            ]}
            onPress={() => setCurrentStep('optional')}
          >
            <Text style={[
              styles.stepButtonText,
              currentStep === 'optional' && styles.stepButtonTextActive
            ]}>
              Optional ({summary.granted - summary.essentialGranted}/{summary.total - summary.essentialTotal})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Permissions List */}
        <View style={styles.permissionsContainer}>
          {(currentStep === 'essential' ? essentialPermissions : optionalPermissions).map((permission) => (
            <View key={permission.key} style={styles.permissionItem}>
              <View style={styles.permissionLeft}>
                <View style={[
                  styles.permissionIcon,
                  { backgroundColor: getCategoryColor(permission.category) }
                ]}>
                  <Ionicons 
                    name={getPermissionIcon(permission)} 
                    size={24} 
                    color="white" 
                  />
                </View>
                <View style={styles.permissionInfo}>
                  <Text style={styles.permissionTitle}>{permission.title}</Text>
                  <Text style={styles.permissionDescription}>{permission.description}</Text>
                  {permission.required && (
                    <Text style={styles.requiredText}>Required</Text>
                  )}
                </View>
              </View>
              <View style={styles.permissionRight}>
                {permission.granted ? (
                  <View style={styles.grantedContainer}>
                    <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                    <Text style={styles.grantedText}>Granted</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.requestButton,
                      requesting === permission.key && styles.requestButtonDisabled
                    ]}
                    onPress={() => handleRequestPermission(permission)}
                    disabled={requesting === permission.key}
                  >
                    {requesting === permission.key ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text style={styles.requestButtonText}>Allow</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          {currentStep === 'essential' && (
            <TouchableOpacity
              style={[
                styles.primaryButton,
                requesting === 'all-essential' && styles.primaryButtonDisabled
              ]}
              onPress={handleRequestAllEssential}
              disabled={requesting === 'all-essential'}
            >
              {requesting === 'all-essential' ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.primaryButtonText}>Allow All Essential</Text>
              )}
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleSkip}
          >
            <Text style={styles.secondaryButtonText}>
              {summary.essentialGranted === summary.essentialTotal ? 'Continue' : 'Skip for Now'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 24,
  },
  progressContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E9ECEF',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'center',
  },
  stepToggle: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginBottom: 24,
    backgroundColor: '#E9ECEF',
    borderRadius: 8,
    padding: 4,
  },
  stepButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  stepButtonActive: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  stepButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C757D',
  },
  stepButtonTextActive: {
    color: '#2C3E50',
  },
  permissionsContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  permissionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  permissionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  permissionInfo: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 14,
    color: '#6C757D',
    lineHeight: 20,
  },
  requiredText: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: '600',
    marginTop: 4,
  },
  permissionRight: {
    marginLeft: 16,
  },
  grantedContainer: {
    alignItems: 'center',
  },
  grantedText: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 4,
    fontWeight: '600',
  },
  requestButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  requestButtonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  requestButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  actionContainer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#6C757D',
    fontSize: 16,
    fontWeight: '500',
  },
});
