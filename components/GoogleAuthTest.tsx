import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import { GOOGLE_OAUTH_CONFIG, GOOGLE_API_ENDPOINTS, GOOGLE_AUTH_ERRORS } from '../config/googleOAuth';

export default function GoogleAuthTest() {
  const [loading, setLoading] = useState(false);

  const testGoogleAuth = async () => {
    setLoading(true);
    try {
      // Check if Google OAuth is configured
      if (!GOOGLE_OAUTH_CONFIG.clientId || GOOGLE_OAUTH_CONFIG.clientId === 'YOUR_GOOGLE_CLIENT_ID') {
        Alert.alert(
          'Google OAuth Not Configured',
          'Please configure your Google OAuth credentials in the environment variables.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Test redirect URI
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'docavailable',
      });

      console.log('Redirect URI:', redirectUri);
      console.log('Google Config:', GOOGLE_OAUTH_CONFIG);

      Alert.alert(
        'Configuration Test',
        `Redirect URI: ${redirectUri}\nClient ID: ${GOOGLE_OAUTH_CONFIG.clientId.substring(0, 20)}...`,
        [{ text: 'OK' }]
      );

    } catch (error: any) {
      console.error('Google auth test error:', error);
      Alert.alert('Test Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Google OAuth Test</Text>
      <TouchableOpacity 
        style={styles.button} 
        onPress={testGoogleAuth}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Testing...' : 'Test Google OAuth Config'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 