import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { useInstantSessionDetector } from '../hooks/useInstantSessionDetector';
import InstantSessionTimer from './InstantSessionTimer';

interface InstantSessionChatIntegrationProps {
  appointmentId: string;
  patientId: number;
  doctorId: number;
  authToken: string;
  onMessageSent?: (message: string) => void;
  onSessionActivated?: () => void;
  onSessionExpired?: () => void;
}

export default function InstantSessionChatIntegration({
  appointmentId,
  patientId,
  doctorId,
  authToken,
  onMessageSent,
  onSessionActivated,
  onSessionExpired
}: InstantSessionChatIntegrationProps) {
  const [inputValue, setInputValue] = useState('');

  // Extract session ID from appointment ID
  const sessionId = appointmentId.replace('text_session_', '');

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

  const canSendMessage = () => {
    // Allow doctors to always send messages, patients only if session is active or if patient hasn't sent first message yet
    // Note: This component doesn't have access to user type, so we'll use a more permissive approach
    return isSessionActivated || (!hasPatientSentMessage) || hasDoctorResponded;
  };

  const getInputPlaceholder = () => {
    if (hasPatientSentMessage && !hasDoctorResponded && isTimerActive) {
      return 'Waiting for doctor to respond...';
    } else if (hasPatientSentMessage && !hasDoctorResponded && !isTimerActive) {
      return 'Session expired - doctor did not respond';
    } else if (isSessionActivated) {
      return 'Type your message...';
    } else {
      return 'Type your message to start the response timer...';
    }
  };

  const handleSendMessage = () => {
    if (inputValue.trim() && canSendMessage()) {
      console.log('📤 [InstantSession] Sending message:', inputValue);
      
      // Call the parent's message handler
      if (onMessageSent) {
        onMessageSent(inputValue);
      }
      
      setInputValue('');
    }
  };

  const handleTimerExpired = () => {
    console.log('⏰ [InstantSession] Timer expired');
    if (onSessionExpired) {
      onSessionExpired();
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
      {/* Timer Component */}
      {hasPatientSentMessage && (
        <InstantSessionTimer
          isActive={isTimerActive}
          timeRemaining={timeRemaining}
          hasPatientSentMessage={hasPatientSentMessage}
          hasDoctorResponded={hasDoctorResponded}
          isSessionActivated={isSessionActivated}
          onTimerExpired={handleTimerExpired}
        />
      )}

      {/* Session Status Messages */}
      {!hasPatientSentMessage && (
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            Send a message to start the response timer
          </Text>
        </View>
      )}

      {hasPatientSentMessage && !hasDoctorResponded && !isTimerActive && (
        <View style={styles.expiredContainer}>
          <Text style={styles.expiredText}>
            Session expired - Doctor did not respond within the response window
          </Text>
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
      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.textInput,
            !canSendMessage() && styles.textInputDisabled
          ]}
          value={inputValue}
          onChangeText={setInputValue}
          placeholder={getInputPlaceholder()}
          multiline
          editable={canSendMessage()}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!canSendMessage() || !inputValue.trim()) && styles.sendButtonDisabled
          ]}
          onPress={handleSendMessage}
          disabled={!canSendMessage() || !inputValue.trim()}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>

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
  infoContainer: {
    backgroundColor: Colors.primary + '10',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    alignItems: 'center',
  },
  infoText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
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
