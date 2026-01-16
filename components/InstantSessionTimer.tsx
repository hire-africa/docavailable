import { useEffect, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  View,
  useColorScheme
} from 'react-native';
import { Colors } from '../constants/Colors';

interface InstantSessionTimerProps {
  isActive: boolean;
  timeRemaining: number;
  hasPatientSentMessage: boolean;
  hasDoctorResponded: boolean;
  isSessionActivated: boolean;
  isSessionExpired: boolean;
  isPatient: boolean;
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
  isPatient,
  onTimerExpired
}: InstantSessionTimerProps) {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  const PRIMARY_COLOR = themeColors.primary;
  const SUCCESS_COLOR = themeColors.success;
  const WARNING_COLOR = themeColors.warning;
  const GRAY_COLOR = themeColors.gray;

  const [pulseAnim] = useState(new Animated.Value(1));
  const [warningAnim] = useState(new Animated.Value(0));
  const [timerHeight] = useState(new Animated.Value(hasPatientSentMessage && !isSessionExpired ? 1 : 0));
  const [timerOpacity] = useState(new Animated.Value(hasPatientSentMessage && !isSessionExpired ? 1 : 0));

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

  // Animate timer section appearance
  useEffect(() => {
    if (hasPatientSentMessage && !isSessionExpired) {
      Animated.parallel([
        Animated.timing(timerHeight, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(timerOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(timerHeight, {
          toValue: 0,
          duration: 250,
          easing: Easing.in(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(timerOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [hasPatientSentMessage, isSessionExpired, timerHeight, timerOpacity]);

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
    
    if (hasPatientSentMessage && !isActive) {
      return 'Session Expired';
    }
    
    // Don't show status text while waiting - just show timer
    return '';
  };

  const getStatusColor = () => {
    if (isSessionActivated) {
      return SUCCESS_COLOR;
    }

    if (hasDoctorResponded) {
      return PRIMARY_COLOR;
    }

    if (isSessionExpired) {
      return '#F44336';
    }
    
    if (hasPatientSentMessage && isActive) {
      return timeRemaining <= 10 ? '#F44336' : WARNING_COLOR;
    }
    
    if (hasPatientSentMessage && !isActive) {
      return '#F44336';
    }

    return GRAY_COLOR;
  };

  const getTimerColor = () => {
    if (timeRemaining <= 10) {
      return '#F44336';
    } else if (timeRemaining <= 30) {
      return WARNING_COLOR;
    }
    return SUCCESS_COLOR;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress based on time remaining
  // Use a reasonable maximum (10 minutes = 600 seconds) for progress calculation
  // The actual countdown is derived from server deadline, this is just for UI progress bar
  const maxDuration = 600; // 10 minutes max for progress calculation
  const progress = isActive && timeRemaining > 0 ? Math.min(100, (timeRemaining / maxDuration) * 100) : 0;

  // Debug logging
  console.log('🔍 [InstantSessionTimer] Props:', {
    isActive,
    timeRemaining,
    hasPatientSentMessage,
    hasDoctorResponded,
    isSessionActivated,
    isSessionExpired
  });

  // Don't render anything if not an instant session scenario
  if (!hasPatientSentMessage && !isSessionExpired && !isActive) {
    return (
      <View style={styles.container}>
        <View style={styles.compactContainer}>
          <View style={styles.infoOnlyContainer}>
            <Text style={styles.title}>Instant Session</Text>
            <Text style={styles.infoText}>
              Send a message to start the response timer
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (isSessionExpired) {
    return (
      <View style={styles.container}>
        <View style={styles.compactContainer}>
          <View style={styles.infoOnlyContainer}>
            <Text style={styles.title}>Instant Session</Text>
            <Text style={[styles.infoText, { color: '#F44336', fontWeight: '600' }]}>
              {isPatient 
                ? 'Doctor did not respond in time - You have not been charged'
                : 'Session expired - You did not respond in time'
              }
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {hasPatientSentMessage && !isSessionExpired && (
        <Animated.View style={[
          {
            opacity: timerOpacity,
            transform: [{
              scaleY: timerHeight.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
              })
            }]
          }
        ]}>
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
                <Text style={styles.title}>
                  {hasPatientSentMessage && isActive && !hasDoctorResponded 
                    ? 'Waiting for Doctor' 
                    : 'Instant Session'}
                </Text>
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
              
              {hasDoctorResponded && (
                <Text style={styles.infoText} numberOfLines={2}>
                  Doctor responded! Session active.
                </Text>
              )}
            </View>
          </View>
        </Animated.View>
      )}
    </View>
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
  infoOnlyContainer: {
    flex: 1,
  },
});
