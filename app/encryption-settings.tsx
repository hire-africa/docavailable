import { useEncryption } from '@/hooks/useEncryption';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function EncryptionSettingsScreen() {
  const router = useRouter();
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome name="arrow-left" size={20} color="#4CAF50" />
        </TouchableOpacity>
        <Text style={styles.title}>Encryption Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Encryption Status</Text>
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <FontAwesome 
                name={encryptionStatus?.encryption_enabled ? "lock" : "unlock"} 
                size={20} 
                color={encryptionStatus?.encryption_enabled ? "#4CAF50" : "#FF9800"} 
              />
              <Text style={styles.statusLabel}>Encryption</Text>
              <Text style={[
                styles.statusValue,
                { color: encryptionStatus?.encryption_enabled ? "#4CAF50" : "#FF9800" }
              ]}>
                {encryptionStatus?.encryption_enabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
            
            <View style={styles.statusRow}>
              <FontAwesome 
                name={encryptionStatus?.has_keys ? "key" : "key"} 
                size={20} 
                color={encryptionStatus?.has_keys ? "#4CAF50" : "#999"} 
              />
              <Text style={styles.statusLabel}>Keys Generated</Text>
              <Text style={[
                styles.statusValue,
                { color: encryptionStatus?.has_keys ? "#4CAF50" : "#999" }
              ]}>
                {encryptionStatus?.has_keys ? 'Yes' : 'No'}
              </Text>
            </View>
          </View>
        </View>

        {/* Actions Section */}
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

          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={handleClearKeys}
            disabled={isLoading}
          >
            <FontAwesome name="trash" size={16} color="#007AFF" style={styles.buttonIcon} />
            <Text style={styles.secondaryButtonText}>Clear Cached Keys</Text>
          </TouchableOpacity>
        </View>

        {/* Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About End-to-End Encryption</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <FontAwesome name="shield" size={16} color="#4CAF50" style={styles.infoIcon} />
              <Text style={styles.infoText}>
                Your messages are encrypted on your device before being sent
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <FontAwesome name="users" size={16} color="#4CAF50" style={styles.infoIcon} />
              <Text style={styles.infoText}>
                Only you and the recipient can read the messages
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <FontAwesome name="server" size={16} color="#4CAF50" style={styles.infoIcon} />
              <Text style={styles.infoText}>
                Not even our servers can access the content of your messages
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <FontAwesome name="key" size={16} color="#4CAF50" style={styles.infoIcon} />
              <Text style={styles.infoText}>
                Encryption keys are stored securely on your device
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <FontAwesome name="exclamation-triangle" size={16} color="#FF9800" style={styles.infoIcon} />
              <Text style={styles.infoText}>
                If you lose your keys, encrypted messages cannot be recovered
              </Text>
            </View>
          </View>
        </View>

        {/* Security Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security Tips</Text>
          <View style={styles.tipsCard}>
            <Text style={styles.tipText}>
              • Keep your device secure and up to date
            </Text>
            <Text style={styles.tipText}>
              • Don't share your device with others when using the app
            </Text>
            <Text style={styles.tipText}>
              • Regularly clear cached keys if using shared devices
            </Text>
            <Text style={styles.tipText}>
              • Enable device encryption for additional security
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  backButton: {
    padding: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 30,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  statusCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#007AFF',
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
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    flex: 1,
  },
  tipsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
}); 