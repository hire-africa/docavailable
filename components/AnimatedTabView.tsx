import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, ViewStyle } from 'react-native';

interface AnimatedTabViewProps {
  children: React.ReactNode;
  isVisible: boolean;
  style?: ViewStyle;
}

export default function AnimatedTabView({ children, isVisible, style }: AnimatedTabViewProps) {
  const fadeAnim = useRef(new Animated.Value(isVisible ? 1 : 0)).current;
  const slideAnim = useRef(new Animated.Value(isVisible ? 0 : 20)).current;

  // Web-specific state
  const [webTransform, setWebTransform] = useState({
    opacity: isVisible ? 1 : 0,
    translateY: isVisible ? 0 : 20
  });

  useEffect(() => {
    if (Platform.OS === 'web') {
      setWebTransform({
        opacity: isVisible ? 1 : 0,
        translateY: isVisible ? 0 : 20
      });
      return;
    }

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: isVisible ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: isVisible ? 0 : 20,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isVisible, fadeAnim, slideAnim]);

  if (Platform.OS === 'web') {
    return (
      <div
        style={{
          opacity: webTransform.opacity,
          transform: `translateY(${webTransform.translateY}px)`,
          transition: 'opacity 300ms ease, transform 300ms ease',
          ...style
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <Animated.View
      style={[
        {
          opacity: fadeAnim,
          transform: Platform.OS === 'web'
            ? `translateY(${slideAnim}px)`
            : [{ translateY: slideAnim }],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
} 