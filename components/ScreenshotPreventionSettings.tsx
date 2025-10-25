import { Ionicons } from '@expo/vector-icons';
import { Alert, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useScreenshotPrevention } from '../hooks/useScreenshotPrevention';

interface ScreenshotPreventionSettingsProps {
  visible: boolean;
  onClose: () => void;
}

export default function ScreenshotPreventionSettings({ visible, onClose }: ScreenshotPreventionSettingsProps) {
  const { 
    isEnabled, 
    config, 
    enable, 
    disable, 
    updateConfig, 
    isLoading, 
    error 
  } = useScreenshotPrevention();

  const handleToggleScreenshotPrevention = async () => {
    try {
      if (isEnabled) {
        await disable();
      } else {
        await enable();
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to toggle screenshot prevention');
    }
  };

  const handleToggleWatermark = async () => {
    try {
      await updateConfig({ showWatermark: !config.showWatermark });
    } catch (err) {
      Alert.alert('Error', 'Failed to update watermark settings');
    }
  };

  const handleToggleNotification = async () => {
    try {
      await updateConfig({ notifyOnScreenshot: !config.notifyOnScreenshot });
    } catch (err) {
      Alert.alert('Error', 'Failed to update notification settings');
    }
  };

  const handleSecurityLevelChange = async (level: 'basic' | 'enhanced' | 'maximum') => {
    try {
      await updateConfig({ securityLevel: level });
    } catch (err) {
      Alert.alert('Error', 'Failed to update security level');
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Screenshot Prevention</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.content}>
         {/* Main Toggle */}
         <View style={styles.settingRow}>
           <View style={styles.settingInfo}>
             <Text style={styles.settingTitle}>Enable Screenshot Prevention</Text>
             <Text style={styles.settingDescription}>
               Screenshots will show black screen instead of chat content
             </Text>
           </View>
          <Switch
            value={isEnabled}
            onValueChange={handleToggleScreenshotPrevention}
            disabled={isLoading}
            trackColor={{ false: '#E5E5E5', true: '#4CAF50' }}
            thumbColor={isEnabled ? '#fff' : '#f4f3f4'}
          />
        </View>

         {/* Watermark Toggle */}
         <View style={styles.settingRow}>
           <View style={styles.settingInfo}>
             <Text style={styles.settingTitle}>Show Watermark</Text>
             <Text style={styles.settingDescription}>
               Display subtle watermark overlay (main protection is black screen)
             </Text>
           </View>
          <Switch
            value={config.showWatermark}
            onValueChange={handleToggleWatermark}
            disabled={isLoading || !isEnabled}
            trackColor={{ false: '#E5E5E5', true: '#4CAF50' }}
            thumbColor={config.showWatermark ? '#fff' : '#f4f3f4'}
          />
        </View>

        {/* Screenshot Notification Toggle */}
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Screenshot Notifications</Text>
            <Text style={styles.settingDescription}>
              Notify when screenshots are attempted (iOS only)
            </Text>
          </View>
          <Switch
            value={config.notifyOnScreenshot}
            onValueChange={handleToggleNotification}
            disabled={isLoading || !isEnabled}
            trackColor={{ false: '#E5E5E5', true: '#4CAF50' }}
            thumbColor={config.notifyOnScreenshot ? '#fff' : '#f4f3f4'}
          />
        </View>

        {/* Security Level */}
        <View style={styles.settingSection}>
          <Text style={styles.sectionTitle}>Security Level</Text>
           <Text style={styles.sectionDescription}>
             {config.securityLevel === 'basic' && 'Basic protection - screenshots show black screen'}
             {config.securityLevel === 'enhanced' && 'Enhanced protection - screenshots and recordings show black screen'}
             {config.securityLevel === 'maximum' && 'Maximum protection - all screen capture shows black screen'}
           </Text>
          
          <View style={styles.securityLevelContainer}>
            {(['basic', 'enhanced', 'maximum'] as const).map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.securityLevelButton,
                  config.securityLevel === level && styles.securityLevelButtonActive
                ]}
                onPress={() => handleSecurityLevelChange(level)}
                disabled={isLoading || !isEnabled}
              >
                <Text style={[
                  styles.securityLevelText,
                  config.securityLevel === level && styles.securityLevelTextActive
                ]}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Status Information */}
        <View style={styles.statusContainer}>
          <View style={styles.statusRow}>
            <Ionicons 
              name={isEnabled ? "shield-checkmark" : "shield"} 
              size={20} 
              color={isEnabled ? "#4CAF50" : "#666"} 
            />
            <Text style={styles.statusText}>
              Screenshot prevention is {isEnabled ? 'enabled' : 'disabled'}
            </Text>
          </View>
          
          {isEnabled && (
            <View style={styles.statusRow}>
              <Ionicons name="information-circle" size={20} color="#666" />
              <Text style={styles.statusText}>
                Protection level: {config.securityLevel}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  settingSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  securityLevelContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  securityLevelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#F9F9F9',
    alignItems: 'center',
  },
  securityLevelButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  securityLevelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  securityLevelTextActive: {
    color: '#fff',
  },
  statusContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  errorContainer: {
    margin: 20,
    padding: 12,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  errorText: {
    color: '#C62828',
    fontSize: 14,
  },
});
