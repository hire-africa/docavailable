import { Ionicons } from '@expo/vector-icons';
import { Alert, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useScreenshotPrevention } from '../hooks/useScreenshotPrevention';

export default function ScreenshotTestButton() {
  const { isEnabled, enable, disable } = useScreenshotPrevention();

  const handleTest = async () => {
    try {
      if (isEnabled) {
        await disable();
        Alert.alert(
          'Screenshot Prevention DISABLED', 
          'Screenshots will now show normal content. Try taking a screenshot now.',
          [{ text: 'OK' }]
        );
      } else {
        await enable();
        Alert.alert(
          'Screenshot Prevention ENABLED', 
          'Screenshots will now show BLACK SCREEN. Try taking a screenshot now.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle screenshot prevention');
    }
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handleTest}>
      <Ionicons 
        name={isEnabled ? "shield-checkmark" : "shield"} 
        size={20} 
        color={isEnabled ? "#4CAF50" : "#FF4444"} 
      />
      <Text style={styles.buttonText}>
        {isEnabled ? 'Disable Screenshot Protection' : 'Enable Screenshot Protection'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  buttonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
});
