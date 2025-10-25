import { StyleSheet, Text, View } from 'react-native';
import { useScreenshotPrevention } from '../hooks/useScreenshotPrevention';

export default function ScreenshotDebugInfo() {
  const { isEnabled, config, isLoading, error } = useScreenshotPrevention();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Screenshot Prevention Debug</Text>
      <Text style={styles.info}>Status: {isEnabled ? 'ENABLED' : 'DISABLED'}</Text>
      <Text style={styles.info}>Loading: {isLoading ? 'YES' : 'NO'}</Text>
      <Text style={styles.info}>Watermark: {config.showWatermark ? 'ON' : 'OFF'}</Text>
      <Text style={styles.info}>Level: {config.securityLevel}</Text>
      {error && <Text style={styles.error}>Error: {error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F0F0F0',
    padding: 8,
    margin: 8,
    borderRadius: 4,
  },
  title: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  info: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  error: {
    fontSize: 10,
    color: '#FF4444',
    marginTop: 4,
  },
});
