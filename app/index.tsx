import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import LandingPage from '../components/LandingPage';

export default function Index() {
  return (
    <SafeAreaView style={styles.container}>
      <LandingPage />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
}); 
