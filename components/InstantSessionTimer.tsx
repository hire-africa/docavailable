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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Instant Session</Text>
        <Text style={[styles.status, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
      </View>

      {hasPatientSentMessage && !isSessionExpired && (
        <View style={styles.timerContainer}>
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
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
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
        </View>
      )}

      <View style={styles.infoContainer}>
        {!hasPatientSentMessage && (
          <Text style={styles.infoText}>
            Send a message to start the 90-second timer
          </Text>
        )}
        
        {hasPatientSentMessage && !hasDoctorResponded && isActive && (
          <Text style={styles.infoText}>
            Doctor has {formatTime(timeRemaining)} to respond
          </Text>
        )}
        
        {hasDoctorResponded && (
          <Text style={styles.infoText}>
            Doctor has responded! Session is now active.
          </Text>
        )}
        
        {isSessionExpired && (
          <Text style={[styles.infoText, { color: Colors.error }]}>
            Session expired - Doctor did not respond within 90 seconds
          </Text>
        )}
        
        {hasPatientSentMessage && !isActive && !hasDoctorResponded && !isSessionExpired && (
          <Text style={[styles.infoText, { color: Colors.error }]}>
            Doctor did not respond within 90 seconds
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  status: {
    fontSize: 14,
    fontWeight: '600',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  timerCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  timerText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '80%',
    height: 8,
    backgroundColor: Colors.lightGray,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  infoContainer: {
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 20,
  },
});
