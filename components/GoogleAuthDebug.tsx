import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Constants from 'expo-constants';
import { GOOGLE_OAUTH_CONFIG } from '../config/googleOAuth';

export default function GoogleAuthDebug() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Google OAuth Debug Info</Text>
      
      <Text style={styles.label}>Environment Variables:</Text>
      <Text style={styles.text}>EXPO_PUBLIC_GOOGLE_CLIENT_ID: {process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || 'NOT SET'}</Text>
      <Text style={styles.text}>EXPO_PUBLIC_GOOGLE_CLIENT_SECRET: {process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET || 'NOT SET'}</Text>
      
      <Text style={styles.label}>Constants.expoConfig?.extra:</Text>
      <Text style={styles.text}>EXPO_PUBLIC_GOOGLE_CLIENT_ID: {Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_CLIENT_ID || 'NOT SET'}</Text>
      <Text style={styles.text}>EXPO_PUBLIC_GOOGLE_CLIENT_SECRET: {Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET || 'NOT SET'}</Text>
      
      <Text style={styles.label}>GOOGLE_OAUTH_CONFIG:</Text>
      <Text style={styles.text}>clientId: {GOOGLE_OAUTH_CONFIG.clientId}</Text>
      <Text style={styles.text}>clientSecret: {GOOGLE_OAUTH_CONFIG.clientSecret}</Text>
      
      <Text style={styles.label}>All Constants.expoConfig?.extra:</Text>
      <Text style={styles.text}>{JSON.stringify(Constants.expoConfig?.extra, null, 2)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    margin: 10,
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
    color: '#666',
  },
  text: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
  },
});
