import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useScreenshotPrevention } from '../hooks/useScreenshotPrevention';

export default function ScreenshotTestComponent() {
  const { isEnabled, enable, disable } = useScreenshotPrevention();
  const [showInstructions, setShowInstructions] = useState(false);

  const handleToggle = async () => {
    try {
      if (isEnabled) {
        await disable();
        Alert.alert('Screenshot Prevention Disabled', 'Screenshots will now show normal content');
      } else {
        await enable();
        Alert.alert('Screenshot Prevention Enabled', 'Screenshots will now show black screen');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle screenshot prevention');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons 
          name={isEnabled ? "shield-checkmark" : "shield"} 
          size={24} 
          color={isEnabled ? "#4CAF50" : "#666"} 
        />
        <Text style={styles.title}>Screenshot Prevention Test</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>
          {isEnabled 
            ? "Screenshot prevention is ENABLED. Try taking a screenshot - you should see a black screen."
            : "Screenshot prevention is DISABLED. Screenshots will show normal content."
          }
        </Text>

        <TouchableOpacity 
          style={[styles.button, isEnabled ? styles.buttonDisabled : styles.buttonEnabled]}
          onPress={handleToggle}
        >
          <Text style={styles.buttonText}>
            {isEnabled ? 'Disable Protection' : 'Enable Protection'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.instructionsButton}
          onPress={() => setShowInstructions(!showInstructions)}
        >
          <Text style={styles.instructionsButtonText}>
            {showInstructions ? 'Hide Instructions' : 'Show Instructions'}
          </Text>
        </TouchableOpacity>

        {showInstructions && (
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>How to Test:</Text>
            <Text style={styles.instructionText}>
              1. Enable screenshot prevention above
            </Text>
            <Text style={styles.instructionText}>
              2. Take a screenshot using your device's screenshot function
            </Text>
            <Text style={styles.instructionText}>
              3. Check your photos - you should see a black screen
            </Text>
            <Text style={styles.instructionText}>
              4. Disable protection and try again - you should see normal content
            </Text>
          </View>
        )}

        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            Status: {isEnabled ? 'PROTECTED' : 'UNPROTECTED'}
          </Text>
          <View style={[styles.statusIndicator, { backgroundColor: isEnabled ? '#4CAF50' : '#FF4444' }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  content: {
    gap: 16,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    textAlign: 'center',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonEnabled: {
    backgroundColor: '#4CAF50',
  },
  buttonDisabled: {
    backgroundColor: '#FF4444',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  instructionsButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  instructionsButtonText: {
    color: '#666',
    fontSize: 14,
  },
  instructionsContainer: {
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    lineHeight: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
