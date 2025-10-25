import { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { screenshotPreventionService } from '../services/screenshotPreventionService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface SecurityWatermarkProps {
  visible?: boolean;
  text?: string;
  opacity?: number;
  fontSize?: number;
  rotation?: number;
}

export default function SecurityWatermark({ 
  visible = true,
  text = 'Doc Available - Confidential',
  opacity = 0.05, // Reduced opacity since main protection is black screen
  fontSize = 14, // Smaller font
  rotation = -15
}: SecurityWatermarkProps) {
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    const checkScreenshotPrevention = async () => {
      const config = screenshotPreventionService.getConfig();
      setIsEnabled(config.enabled && config.showWatermark);
    };

    checkScreenshotPrevention();
  }, []);

  if (!visible || !isEnabled) {
    return null;
  }

  // Create fewer watermarks since main protection is black screen
  const watermarks = Array.from({ length: 4 }, (_, index) => {
    const row = Math.floor(index / 2);
    const col = index % 2;
    
    return (
      <View
        key={index}
        style={[
          styles.watermark,
          {
            top: (screenHeight / 2) * row + 100,
            left: (screenWidth / 2) * col + 50,
            opacity,
            transform: [{ rotate: `${rotation}deg` }]
          }
        ]}
      >
        <Text style={[styles.watermarkText, { fontSize }]}>
          {text}
        </Text>
      </View>
    );
  });

  return (
    <View style={styles.container} pointerEvents="none">
      {watermarks}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    pointerEvents: 'none',
  },
  watermark: {
    position: 'absolute',
    backgroundColor: 'transparent',
    padding: 10,
  },
  watermarkText: {
    color: '#666',
    fontWeight: 'bold',
    textAlign: 'center',
    includeFontPadding: false,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
