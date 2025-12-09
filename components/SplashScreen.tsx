import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, View } from 'react-native';

const { width, height } = Dimensions.get('window');
const isWeb = typeof window !== 'undefined';

interface SplashScreenProps {
  onAnimationComplete: () => void;
}

export default function SplashScreen({ onAnimationComplete }: SplashScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const iconRotateAnim = useRef(new Animated.Value(0)).current;

  // Web-specific state for transforms
  const [webTransform, setWebTransform] = useState({
    scale: 0.8,
    translateY: 50,
    rotate: 0,
    opacity: 0
  });

  useEffect(() => {
    if (Platform.OS === 'web') {
      // Web animation using state
      const animateWeb = async () => {
        // Fade in and scale up
        setWebTransform({ scale: 1, translateY: 0, rotate: 0, opacity: 1 });
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Hold
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Rotate
        setWebTransform(prev => ({ ...prev, rotate: 360 }));
        await new Promise(resolve => setTimeout(resolve, 600));
        
        // Hold
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Fade out
        setWebTransform(prev => ({ ...prev, opacity: 0 }));
        await new Promise(resolve => setTimeout(resolve, 500));
        
        onAnimationComplete();
      };
      
      animateWeb();
      return;
    }

    // Native animation
    const animationSequence = Animated.sequence([
      // Initial fade in and scale up
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      // Hold for a moment
      Animated.delay(500),
      // Icon rotation
      Animated.timing(iconRotateAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      // Hold again
      Animated.delay(300),
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]);

    animationSequence.start(() => {
      setTimeout(() => {
        onAnimationComplete();
      }, 0);
    });

    return () => {
      animationSequence.stop();
    };
  }, [fadeAnim, scaleAnim, slideAnim, iconRotateAnim, onAnimationComplete]);

  const iconRotation = iconRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <View
          style={[
            styles.content,
            {
              opacity: webTransform.opacity,
              transform: `scale(${webTransform.scale}) translateY(${webTransform.translateY}px)`,
            },
          ]}
        >
          <View
            style={[
              styles.iconContainer,
              {
                transform: `rotate(${webTransform.rotate}deg)`,
              },
            ]}
          >
            <FontAwesome name="stethoscope" size={60} color="#4CAF50" />
          </View>
          
          <Text style={styles.title}>Doc Available</Text>
          <Text style={styles.subtitle}>Healthcare at your fingertips</Text>
          
          <View style={styles.loadingDots}>
            <View style={[styles.dot, { opacity: webTransform.opacity }]} />
            <View style={[styles.dot, { opacity: webTransform.opacity }]} />
            <View style={[styles.dot, { opacity: webTransform.opacity }]} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
              <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: Platform.OS === 'web' 
                ? `scale(${scaleAnim}) translateY(${slideAnim}px)`
                : [
                    { scale: scaleAnim },
                    { translateY: slideAnim },
                  ],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.iconContainer,
              {
                transform: Platform.OS === 'web'
                  ? `rotate(${iconRotation})`
                  : [{ rotate: iconRotation }],
              },
            ]}
          >
          <FontAwesome name="stethoscope" size={60} color="#4CAF50" />
        </Animated.View>
        
        <Text style={styles.title}>Doc Available</Text>
        <Text style={styles.subtitle}>Healthcare at your fingertips</Text>
        
        <View style={styles.loadingDots}>
          <Animated.View style={[styles.dot, { opacity: fadeAnim }]} />
          <Animated.View style={[styles.dot, { opacity: fadeAnim }]} />
          <Animated.View style={[styles.dot, { opacity: fadeAnim }]} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: isWeb ? 48 : 36,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: isWeb ? 18 : 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginHorizontal: 4,
  },
}); 