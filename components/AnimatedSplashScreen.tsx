import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Image,
    StyleSheet,
    Text
} from 'react-native';

interface AnimatedSplashScreenProps {
  onAnimationComplete: () => void;
}

export default function AnimatedSplashScreen({ onAnimationComplete }: AnimatedSplashScreenProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    // Reset all animations to initial state
    scaleAnim.setValue(1);
    translateYAnim.setValue(0);
    opacityAnim.setValue(1);

    // Small delay to ensure reset is complete
    const resetTimer = setTimeout(() => {
      // Animation sequence
      const animationSequence = Animated.sequence([
        // Initial delay - logo visible for 2 seconds
        Animated.delay(2000),
        
        // Logo shrinks - fast
        Animated.timing(scaleAnim, {
          toValue: 0.75,
          duration: 300,
          useNativeDriver: true,
        }),
        
        // Logo returns to normal size with bounce - fast spring
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 6,
          useNativeDriver: true,
        }),
        
        // Logo moves up and fades out
        Animated.parallel([
          Animated.timing(translateYAnim, {
            toValue: -150,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ]);

      animationSequence.start(() => {
        // Ensure we call onAnimationComplete only after full animation
        setTimeout(() => {
          onAnimationComplete();
        }, 100);
      });

      // Cleanup function
      return () => {
        animationSequence.stop();
      };
    }, 50);

    return () => {
      clearTimeout(resetTimer);
    };
  }, [animationKey]); // Add animationKey as dependency

  // Force re-render on reload
  useEffect(() => {
    setAnimationKey(prev => prev + 1);
  }, []);

  return (
    <Animated.View 
      style={[
        styles.container, 
        { key: animationKey }
      ]}
    >
      <LinearGradient
        colors={['#4CAF50', '#45a049', '#388E3C']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: opacityAnim,
            transform: [
              { scale: scaleAnim },
              { translateY: translateYAnim }
            ],
          },
        ]}
      >
        <Image
          source={require('../assets/images/icon-white.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      <Text style={styles.betaText}>
        Beta Version
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 119, // Reduced by 15% from 140
    height: 119, // Reduced by 15% from 140
  },
  betaText: {
    position: 'absolute',
    bottom: 60,
    fontSize: 14,
    color: '#E8F5E8',
    opacity: 0.8,
    fontWeight: '500',
  },
});
