import { useEffect, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';

export function HelloWave() {
  const rotationAnimation = useSharedValue(0);
  const [webRotation, setWebRotation] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'web') {
      // Web animation using state
      const animateWeb = async () => {
        for (let i = 0; i < 4; i++) {
          setWebRotation(25);
          await new Promise(resolve => setTimeout(resolve, 150));
          setWebRotation(0);
          await new Promise(resolve => setTimeout(resolve, 150));
        }
      };
      animateWeb();
      return;
    }

    // Native animation
    rotationAnimation.value = withRepeat(
      withSequence(withTiming(25, { duration: 150 }), withTiming(0, { duration: 150 })),
      4 // Run the animation 4 times
    );
  }, [rotationAnimation]);

  if (Platform.OS === 'web') {
    return (
      <div
        style={{
          transform: `rotate(${webRotation}deg)`,
          transition: 'transform 150ms ease',
        }}
      >
        <ThemedText style={styles.text}>👋</ThemedText>
      </div>
    );
  }

  const animatedStyle = useAnimatedStyle(() => ({
    transform: Platform.OS === 'web'
      ? `rotate(${rotationAnimation.value}deg)`
      : [{ rotate: `${rotationAnimation.value}deg` }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <ThemedText style={styles.text}>👋</ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 28,
    lineHeight: 32,
    marginTop: -6,
  },
});
