import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import InstantSessionIntegration from '../components/InstantSessionIntegration';
import { Colors } from '../constants/Colors';

// Example showing how to use InstantSessionIntegration with input section
export default function InstantSessionWithInputExample() {
  const [inputValue, setInputValue] = useState('');

  const handleInputChange = (text: string) => {
    setInputValue(text);
  };

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      console.log('Sending message:', inputValue);
      // Here you would send the message through your WebRTC chat service
      setInputValue('');
    }
  };

  const handleSessionActivated = () => {
    console.log('Session activated - doctor responded');
  };

  const handleSessionExpired = () => {
    console.log('Session expired - doctor did not respond');
  };

  return (
    <View style={styles.container}>
      <InstantSessionIntegration
        sessionId="123"
        appointmentId="text_session_123"
        patientId={456}
        doctorId={789}
        authToken="your-auth-token-here"
        showInputSection={true}
        inputValue={inputValue}
        onInputChange={handleInputChange}
        onSendMessage={handleSendMessage}
        onSessionActivated={handleSessionActivated}
        onSessionExpired={handleSessionExpired}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
