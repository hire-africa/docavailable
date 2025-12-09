import { FontAwesome } from '@expo/vector-icons';
import React from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useEncryption } from '../hooks/useEncryption';

interface EncryptionSettingsProps {
  onClose?: () => void;
}

export default function EncryptionSettings({ onClose }: EncryptionSettingsProps) {
  const {
    encryptionStatus,
    isLoading,
    generateKeys,
    clearAllKeys,
  } = useEncryption();

  const handleGenerateKeys = async () => {
    Alert.alert(
      'Generate Encryption Keys',
      'This will generate new encryption keys for your account. This action cannot be undone. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          style: 'destructive',
          onPress: generateKeys,
        },
      ]
    );
  };

  const handleDisableEncryption = () => {
    Alert.alert(
      'Disable Encryption',
      'This will disable encryption for your account. All encrypted messages will become unreadable. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: async () => {
            try {
              // This would call the disable encryption API
              Alert.alert('Success', 'Encryption disabled successfully!');
            } catch (error) {
              Alert.alert('Error', 'Failed to disable encryption.');
            }
          },
        },
      ]
    );
  };

  const handleClearKeys = () => {
    Alert.alert(
      'Clear Cached Keys',
      'This will clear all cached encryption keys from your device. You will need to re-enter room keys. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearAllKeys();
            Alert.alert('Success', 'Cached keys cleared successfully!');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Encryption Settings</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <FontAwesome name="times" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>
        {/* Encryption Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Encryption Status</Text>
          <View style={styles.statusContainer}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Encryption Enabled:</Text>
              <View style={styles.statusValue}>
                {isLoading ? (
                  <ActivityIndicator size="small" color="#007AFF" />
                ) : (
                  <Text style={[
                    styles.statusText,
                    { color: encryptionStatus?.encryption_enabled ? '#4CAF50' : '#F44336' }
                  ]}>
                    {encryptionStatus?.encryption_enabled ? 'Yes' : 'No'}
                  </Text>
                )}
              </View>
            </View>
            
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Keys Generated:</Text>
              <View style={styles.statusValue}>
                {isLoading ? (
                  <ActivityIndicator size="small" color="#007AFF" />
                ) : (
                  <Text style={[
                    styles.statusText,
                    { color: encryptionStatus?.has_keys ? '#4CAF50' : '#F44336' }
                  ]}>
                    {encryptionStatus?.has_keys ? 'Yes' : 'No'}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          {!encryptionStatus?.encryption_enabled && (
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={handleGenerateKeys}
              disabled={isLoading}
            >
              <FontAwesome name="key" size={16} color="white" style={styles.buttonIcon} />
              <Text style={styles.primaryButtonText}>Generate Encryption Keys</Text>
              {isLoading && <ActivityIndicator size="small" color="white" style={styles.buttonLoader} />}
            </TouchableOpacity>
          )}

          {encryptionStatus?.encryption_enabled && (
            <View style={styles.infoBox}>
              <FontAwesome name="check-circle" size={16} color="#4CAF50" style={styles.buttonIcon} />
              <Text style={styles.infoText}>Encryption is enabled and mandatory for all messages</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={handleClearKeys}
            disabled={isLoading}
          >
            <FontAwesome name="trash" size={16} color="#007AFF" style={styles.buttonIcon} />
            <Text style={styles.secondaryButtonText}>Clear Cached Keys</Text>
          </TouchableOpacity>
        </View>

        {/* Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Encryption</Text>
          
          <View style={styles.infoItem}>
            <FontAwesome name="shield" size={16} color="#4CAF50" style={styles.infoIcon} />
            <Text style={styles.infoDescription}>
              All messages in Doc Available are encrypted using end-to-end encryption (E2EE). This means your messages can only be read by you and the person you're chatting with.
            </Text>
          </View>
          
          <View style={styles.infoItem}>
            <FontAwesome name="lock" size={16} color="#4CAF50" style={styles.infoIcon} />
            <Text style={styles.infoDescription}>
              Not even our servers can access the content of your encrypted messages. Your privacy and security are our top priority.
            </Text>
          </View>
          
          <View style={styles.infoItem}>
            <FontAwesome name="key" size={16} color="#4CAF50" style={styles.infoIcon} />
            <Text style={styles.infoDescription}>
              Encryption keys are automatically generated and managed for you. You can clear cached keys from your device if needed.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  statusContainer: {
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 16,
    color: '#666',
  },
  statusValue: {
    minWidth: 60,
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
    minHeight: 48,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  dangerButton: {
    backgroundColor: '#F44336',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonLoader: {
    marginLeft: 8,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dangerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginTop: 10,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  infoIcon: {
    marginRight: 10,
    marginTop: 5,
  },
  infoDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
}); 