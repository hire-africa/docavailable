import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Animated,
  PanResponder,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SwipeableMessageProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onLongPress?: () => void;
  isSentByCurrentUser: boolean;
}

export const SwipeableMessage: React.FC<SwipeableMessageProps> = ({
  children,
  onSwipeLeft,
  onLongPress,
  isSentByCurrentUser,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const longPressTimer = useRef<any>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to horizontal swipes (not vertical scrolling)
        // More horizontal than vertical, but not too strict
        const isHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5;
        const hasMinDistance = Math.abs(gestureState.dx) > 10;
        return isHorizontal && hasMinDistance;
      },
      onPanResponderGrant: () => {
        // Start long press timer
        longPressTimer.current = setTimeout(() => {
          if (onLongPress) {
            onLongPress();
          }
        }, 500);
      },
      onPanResponderMove: (_, gestureState) => {
        // Cancel long press if user moves
        if (longPressTimer.current && Math.abs(gestureState.dx) > 5) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }

        // All messages: swipe RIGHT only (positive dx)
        if (gestureState.dx > 0) {
          translateX.setValue(Math.min(gestureState.dx, 80));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // Clear long press timer
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }

        // Trigger reply if swiped right enough
        const threshold = 50;
        if (gestureState.dx > threshold) {
          if (onSwipeLeft) {
            onSwipeLeft();
          }
        }

        // Animate back to original position
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
        }).start();
      },
      onPanResponderTerminate: () => {
        // Clear long press timer
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }

        // Animate back
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const replyIconOpacity = translateX.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {/* Message content */}
      <Animated.View
        style={[
          styles.messageContainer,
          { transform: [{ translateX }] },
        ]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>

      {/* Reply icon (appears on right when swiping right) */}
      <Animated.View
        style={[
          styles.replyIconContainer,
          styles.replyIconRight,
          { opacity: replyIconOpacity },
        ]}
      >
        <Ionicons name="arrow-undo" size={20} color="#4CAF50" />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
  },
  messageContainer: {
    width: '100%',
  },
  replyIconContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
  },
  replyIconLeft: {
    left: 10,
  },
  replyIconRight: {
    right: 10,
  },
});
