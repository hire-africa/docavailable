import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import SignUpPage from '../components/SignUpPage';

export default function SignUp() {
  return (
    <SafeAreaView style={styles.container}>
      <SignUpPage />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
}); 