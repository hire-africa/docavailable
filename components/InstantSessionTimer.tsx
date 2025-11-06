import { useEffect, useState } from 'react';
import {
    Animated,
    Dimensions,
    Easing,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { Colors } from '../constants/Colors';

interface InstantSessionTimerProps {
  isActive: boolean;
  timeRemaining: number;
  hasPatientSentMessage: boolean;
  hasDoctorResponded: boolean;
  isSessionActivated: boolean;
  isSessionExpired: boolean;
  onTimerExpired?: () => void;
}

const { width } = Dimensions.get('window');

export default function InstantSessionTimer({
  isActive,
  timeRemaining,
  hasPatientSentMessage,
  hasDoctorResponded,
  isSessionActivated,
  isSessionExpired,
  onTimerExpired
}: InstantSessionTimerProps) {
  const [pulseAnim] = useState(new Animated.Value(1));
  const [warningAnim] = useState(new Animated.Value(0));
  const [containerHeight] = useState(new Animated.Value(0));
  const [containerOpacity] = useState(new Animated.Value(0));

  // Pulse animation for active timer
  useEffect(() => {
    if (isActive && timeRemaining > 0) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isActive, timeRemaining]);

  // Warning animation when time is running low
  useEffect(() => {
    if (isActive && timeRemaining <= 10 && timeRemaining > 0) {
      const warning = Animated.loop(
        Animated.sequence([
          Animated.timing(warningAnim, {
            toValue: 1,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(warningAnim, {
            toValue: 0,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      warning.start();
      return () => warning.stop();
    }
  }, [isActive, timeRemaining]);

  // Call onTimerExpired when timer reaches 0
  useEffect(() => {
    if (isActive && timeRemaining === 0 && onTimerExpired) {
      onTimerExpired();
    }
  }, [isActive, timeRemaining, onTimerExpired]);

  // Animate container appearance
  useEffect(() => {
    if (hasPatientSentMessage && !isSessionExpired) {
      Animated.parallel([
        Animated.timing(containerHeight, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(containerOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(containerHeight, {
          toValue: 0,
          duration: 250,
          easing: Easing.in(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(containerOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [hasPatientSentMessage, isSessionExpired]);

  const getStatusText = () => {
    if (isSessionActivated) {
      return 'Session Active';
    }
    
    if (hasDoctorResponded) {
      return 'Doctor Responded';
    }
    
    if (isSessionExpired) {
      return 'Session Expired';
    }
    
    if (hasPatientSentMessage && isActive) {
      return 'Waiting for Doctor';
    }
    
    if (hasPatientSentMessage && !isActive) {
      return 'Session Expired';
    }
    
    return 'Ready to Send Message';
  };

  const getStatusColor = () => {
    if (isSessionActivated) {
      return Colors.success;
    }
    
    if (hasDoctorResponded) {
      return Colors.primary;
    }
    
    if (isSessionExpired) {
      return Colors.error;
    }
    
    if (hasPatientSentMessage && isActive) {
      return timeRemaining <= 10 ? Colors.error : Colors.warning;
    }
    
    if (hasPatientSentMessage && !isActive) {
      return Colors.error;
    }
    
    return Colors.gray;
  };

  const getTimerColor = () => {
    if (timeRemaining <= 10) {
      return Colors.error;
    } else if (timeRemaining <= 30) {
      return Colors.warning;
    }
    return Colors.primary;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = isActive ? (timeRemaining / 90) * 100 : 0;

  return (
    <Animated.View style={[
      styles.container,
      {
        opacity: containerOpacity,
        transform: [{
          scaleY: containerHeight.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1],
          })
        }]
      }
    ]}>
      {hasPatientSentMessage && !isSessionExpired && (
        <View style={styles.compactContainer}>
          <View style={styles.leftSection}>
            <Animated.View
              style={[
                styles.timerCircle,
                {
                  transform: [{ scale: pulseAnim }],
                  borderColor: getTimerColor(),
                  backgroundColor: timeRemaining <= 10 ? 
                    warningAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['rgba(244, 67, 54, 0.1)', 'rgba(244, 67, 54, 0.3)']
                    }) : 
                    'rgba(76, 175, 80, 0.1)'
                }
              ]}
            >
              <Text style={[styles.timerText, { color: getTimerColor() }]}>
                {formatTime(timeRemaining)}
              </Text>
            </Animated.View>
          </View>
          
          <View style={styles.rightSection}>
            <View style={styles.header}>
              <Text style={styles.title}>Instant Session</Text>
              <Text style={[styles.status, { color: getStatusColor() }]}>
                {getStatusText()}
              </Text>
            </View>
            
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      width: `${progress}%`,
                      backgroundColor: getTimerColor()
                    }
                  ]}
                />
              </View>
            </View>
            
            <Text style={styles.infoText}>
              {hasPatientSentMessage && !hasDoctorResponded && isActive && (
                `Doctor has ${formatTime(timeRemaining)} to respond`
              )}
              {hasDoctorResponded && 'Doctor responded! Session active.'}
            </Text>
          </View>
        </View>
      )}

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  compactContainer: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
  },
  leftSection: {
    marginRight: 12,
  },
  rightSection: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  status: {
    fontSize: 11,
    fontWeight: '600',
  },
  timerCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 6,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  infoText: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 16,
  },
});
