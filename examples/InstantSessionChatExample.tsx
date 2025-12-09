import { useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import InstantSessionTimer from '../components/InstantSessionTimer';
import { Colors } from '../constants/Colors';
import { useInstantSessionDetector } from '../hooks/useInstantSessionDetector';

// Example usage in a chat screen
export default function InstantSessionChatExample() {
  // Example session data - replace with actual data from your app
  const sessionId = '123';
  const appointmentId = 'text_session_123';
  const patientId = 456;
  const doctorId = 789;
  const authToken = 'your-auth-token-here';

  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sessionStatus, setSessionStatus] = useState('waiting');

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

  // Handle session state changes
  useEffect(() => {
    if (isSessionActivated) {
      setSessionStatus('active');
      Alert.alert(
        'Session Activated',
        'The doctor has responded! Your session is now active.',
        [{ text: 'OK' }]
      );
    } else if (hasPatientSentMessage && !hasDoctorResponded && !isTimerActive) {
      setSessionStatus('expired');
      Alert.alert(
        'Session Expired',
        'The doctor did not respond within 90 seconds.',
        [{ text: 'OK' }]
      );
    } else if (hasPatientSentMessage && !hasDoctorResponded) {
      setSessionStatus('waiting');
    }
  }, [isSessionActivated, hasPatientSentMessage, hasDoctorResponded, isTimerActive]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const message = {
      id: `msg_${Date.now()}`,
      text: newMessage,
      senderId: patientId,
      timestamp: new Date().toISOString(),
      isPatient: true
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // In a real app, you would send this through your WebRTC chat service
    // The message detector will automatically detect this and start the timer
    console.log('Message sent:', message);
  };

  const handleSessionActivated = () => {
    console.log('Session activated - doctor responded');
    setSessionStatus('active');
  };

  const handleSessionExpired = () => {
    console.log('Session expired - doctor did not respond');
    setSessionStatus('expired');
  };

  const handleClearSession = async () => {
    await clearState();
    setMessages([]);
    setSessionStatus('waiting');
    setNewMessage('');
  };

  const getStatusMessage = () => {
    if (sessionStatus === 'active') {
      return 'Session is active - you can chat with the doctor';
    } else if (sessionStatus === 'expired') {
      return 'Session expired - doctor did not respond within 90 seconds';
    } else if (hasPatientSentMessage) {
      return 'Waiting for doctor to respond...';
    } else {
      return 'Send a message to start the 90-second timer';
    }
  };

  const canSendMessage = () => {
    // Only allow sending messages if session is active or if patient hasn't sent first message yet
    return sessionStatus === 'active' || (!hasPatientSentMessage && sessionStatus === 'waiting');
  };

  const getInputPlaceholder = () => {
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Instant Session Chat</Text>
        <Text style={styles.statusText}>{getStatusMessage()}</Text>
      </View>

      {/* Timer Component */}
      {hasPatientSentMessage && (
        <InstantSessionTimer
          isActive={isTimerActive}
          timeRemaining={timeRemaining}
          hasPatientSentMessage={hasPatientSentMessage}
          hasDoctorResponded={hasDoctorResponded}
          isSessionActivated={isSessionActivated}
          onTimerExpired={handleSessionExpired}
        />
      )}

      {/* Messages */}
      <ScrollView style={styles.messagesContainer}>
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.message,
              message.isPatient ? styles.patientMessage : styles.doctorMessage
            ]}
          >
            <Text style={styles.messageText}>{message.text}</Text>
            <Text style={styles.messageTime}>
              {new Date(message.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        ))}
      </ScrollView>

       {/* Input Area */}
       <View style={styles.inputContainer}>
         <TextInput
           style={[
             styles.textInput,
             !canSendMessage() && styles.textInputDisabled
           ]}
           value={newMessage}
           onChangeText={setNewMessage}
           placeholder={getInputPlaceholder()}
           multiline
           editable={canSendMessage()}
         />
         <TouchableOpacity
           style={[
             styles.sendButton,
             (!canSendMessage() || !newMessage.trim()) && styles.sendButtonDisabled
           ]}
           onPress={sendMessage}
           disabled={!canSendMessage() || !newMessage.trim()}
         >
           <Text style={styles.sendButtonText}>Send</Text>
         </TouchableOpacity>
       </View>

      {/* Debug Info */}
      {__DEV__ && (
        <View style={styles.debugContainer}>
          <Text style={styles.debugTitle}>Debug Info:</Text>
          <Text style={styles.debugText}>Connected: {isConnected ? 'Yes' : 'No'}</Text>
          <Text style={styles.debugText}>Patient Sent: {hasPatientSentMessage ? 'Yes' : 'No'}</Text>
          <Text style={styles.debugText}>Doctor Responded: {hasDoctorResponded ? 'Yes' : 'No'}</Text>
          <Text style={styles.debugText}>Session Activated: {isSessionActivated ? 'Yes' : 'No'}</Text>
          <Text style={styles.debugText}>Timer Active: {isTimerActive ? 'Yes' : 'No'}</Text>
          <Text style={styles.debugText}>Time Remaining: {timeRemaining}s</Text>
          <Text style={styles.debugText}>Session Status: {sessionStatus}</Text>
          
          <TouchableOpacity style={styles.debugButton} onPress={handleClearSession}>
            <Text style={styles.debugButtonText}>Clear Session</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    padding: 16,
    paddingTop: 50,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  message: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    maxWidth: '80%',
  },
  patientMessage: {
    backgroundColor: Colors.primary + '20',
    alignSelf: 'flex-end',
  },
  doctorMessage: {
    backgroundColor: Colors.lightGray,
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 16,
    color: Colors.text,
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 12,
    color: Colors.gray,
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
  debugContainer: {
    backgroundColor: Colors.lightGray,
    padding: 12,
    margin: 16,
    borderRadius: 8,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: Colors.text,
    marginBottom: 2,
  },
  debugButton: {
    backgroundColor: Colors.gray,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  debugButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});
