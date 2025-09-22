import { useEffect, useState } from 'react';
import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Colors } from '../constants/Colors';
import { useInstantSessionDetector } from '../hooks/useInstantSessionDetector';
import InstantSessionTimer from './InstantSessionTimer';

interface InstantSessionIntegrationProps {
  sessionId: string;
  appointmentId: string;
  patientId: number;
  doctorId: number;
  authToken: string;
  onSessionActivated?: () => void;
  onSessionExpired?: () => void;
  showInputSection?: boolean;
  inputPlaceholder?: string;
  onInputChange?: (text: string) => void;
  onSendMessage?: () => void;
  inputValue?: string;
}

export default function InstantSessionIntegration({
  sessionId,
  appointmentId,
  patientId,
  doctorId,
  authToken,
  onSessionActivated,
  onSessionExpired,
  showInputSection = false,
  inputPlaceholder,
  onInputChange,
  onSendMessage,
  inputValue = ''
}: InstantSessionIntegrationProps) {
  const [showTimer, setShowTimer] = useState(false);

  const {
    isConnected,
    timerState,
    hasPatientSentMessage,
    hasDoctorResponded,
    isSessionActivated,
    isTimerActive,
    timeRemaining,
    connect,
    disconnect,
    clearState
  } = useInstantSessionDetector({
    sessionId,
    appointmentId,
    patientId,
    doctorId,
    authToken,
    enabled: true
  });

  // Handle session activation
  useEffect(() => {
    if (isSessionActivated && onSessionActivated) {
      onSessionActivated();
    }
  }, [isSessionActivated, onSessionActivated]);

  // Handle timer expiration
  useEffect(() => {
    if (isTimerActive && timeRemaining === 0 && onSessionExpired) {
      onSessionExpired();
    }
  }, [isTimerActive, timeRemaining, onSessionExpired]);

  // Show timer when patient sends message
  useEffect(() => {
    if (hasPatientSentMessage && !hasDoctorResponded) {
      setShowTimer(true);
    } else if (hasDoctorResponded || isSessionActivated) {
      setShowTimer(false);
    }
  }, [hasPatientSentMessage, hasDoctorResponded, isSessionActivated]);

  const handleTimerExpired = () => {
    Alert.alert(
      'Session Expired',
      'The doctor did not respond within 90 seconds. The session has expired.',
      [
        {
          text: 'OK',
          onPress: () => {
            setShowTimer(false);
            if (onSessionExpired) {
              onSessionExpired();
            }
          }
        }
      ]
    );
  };

  const handleSessionActivated = () => {
    Alert.alert(
      'Session Activated',
      'The doctor has responded! Your session is now active.',
      [
        {
          text: 'Continue',
          onPress: () => {
            setShowTimer(false);
            if (onSessionActivated) {
              onSessionActivated();
            }
          }
        }
      ]
    );
  };

  const handleDisconnect = async () => {
    await disconnect();
    setShowTimer(false);
  };

  const handleClearState = async () => {
    await clearState();
    setShowTimer(false);
  };

  const canSendMessage = () => {
    // Allow doctors to always send messages, patients only if session is active or if patient hasn't sent first message yet
    // Note: This component doesn't have access to user type, so we'll use a more permissive approach
    return isSessionActivated || (!hasPatientSentMessage) || hasDoctorResponded;
  };

  const getInputPlaceholder = () => {
    if (inputPlaceholder) return inputPlaceholder;
    
    if (hasPatientSentMessage && !hasDoctorResponded && isTimerActive) {
      return 'Waiting for doctor to respond...';
    } else if (hasPatientSentMessage && !hasDoctorResponded && !isTimerActive) {
      return 'Session expired - doctor did not respond';
    } else if (isSessionActivated) {
      return 'Type your message...';
    } else {
      return 'Type your message to start the 90-second timer...';
    }
  };

  if (!isConnected) {
    return (
      <View style={styles.container}>
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>Connecting to session...</Text>
          <TouchableOpacity style={styles.button} onPress={connect}>
            <Text style={styles.buttonText}>Retry Connection</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showTimer && (
        <InstantSessionTimer
          isActive={isTimerActive}
          timeRemaining={timeRemaining}
          hasPatientSentMessage={hasPatientSentMessage}
          hasDoctorResponded={hasDoctorResponded}
          isSessionActivated={isSessionActivated}
          onTimerExpired={handleTimerExpired}
        />
      )}

      {!showTimer && hasPatientSentMessage && !hasDoctorResponded && !isSessionActivated && (
        <View style={styles.expiredContainer}>
          <Text style={styles.expiredText}>
            Session expired - Doctor did not respond within 90 seconds
          </Text>
          <TouchableOpacity style={styles.clearButton} onPress={handleClearState}>
            <Text style={styles.clearButtonText}>Clear Session</Text>
          </TouchableOpacity>
        </View>
      )}

       {isSessionActivated && (
         <View style={styles.activatedContainer}>
           <Text style={styles.activatedText}>
             ✅ Session is now active! You can continue chatting with the doctor.
           </Text>
         </View>
       )}

       {/* Input Section */}
       {showInputSection && (
         <View style={styles.inputContainer}>
           <TextInput
             style={[
               styles.textInput,
               !canSendMessage() && styles.textInputDisabled
             ]}
             value={inputValue}
             onChangeText={onInputChange}
             placeholder={getInputPlaceholder()}
             multiline
             editable={canSendMessage()}
           />
           <TouchableOpacity
             style={[
               styles.sendButton,
               (!canSendMessage() || !inputValue.trim()) && styles.sendButtonDisabled
             ]}
             onPress={onSendMessage}
             disabled={!canSendMessage() || !inputValue.trim()}
           >
             <Text style={styles.sendButtonText}>Send</Text>
           </TouchableOpacity>
         </View>
       )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusContainer: {
    padding: 20,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    color: Colors.text,
    marginBottom: 16,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
  expiredContainer: {
    backgroundColor: Colors.error + '10',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.error + '30',
    alignItems: 'center',
  },
  expiredText: {
    color: Colors.error,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  clearButton: {
    backgroundColor: Colors.error,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  clearButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  activatedContainer: {
    backgroundColor: Colors.success + '10',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.success + '30',
    alignItems: 'center',
  },
  activatedText: {
    color: Colors.success,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
   inputContainer: {
     flexDirection: 'row',
     padding: 16,
     backgroundColor: 'white',
     borderTopWidth: 1,
     borderTopColor: Colors.lightGray,
   },
   textInput: {
     flex: 1,
     borderWidth: 1,
     borderColor: Colors.lightGray,
     borderRadius: 20,
     paddingHorizontal: 16,
     paddingVertical: 8,
     marginRight: 8,
     maxHeight: 100,
   },
   textInputDisabled: {
     backgroundColor: Colors.lightGray + '30',
     borderColor: Colors.gray,
     color: Colors.gray,
   },
   sendButton: {
     backgroundColor: Colors.primary,
     paddingHorizontal: 20,
     paddingVertical: 8,
     borderRadius: 20,
     justifyContent: 'center',
   },
   sendButtonDisabled: {
     backgroundColor: Colors.gray,
   },
   sendButtonText: {
     color: 'white',
     fontWeight: '600',
   },
 });
