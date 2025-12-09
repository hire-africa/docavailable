import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import LandingPage from '../components/LandingPage';
import { useAuth } from '../contexts/AuthContext';

export default function App() {
  const { user, userData, loading } = useAuth();
  const hasNavigated = useRef(false);

  useEffect(() => {
    if (loading || hasNavigated.current) return;

    if (!user) {
      // Do NOT auto-redirect to /login
      // Show the landing page below
      return;
    }

    if (userData?.userType === 'doctor') {
      if (userData.status === 'pending') {
        hasNavigated.current = true;
        router.replace('/pending-approval');
        return;
      }
      if (userData.status === 'approved') {
        hasNavigated.current = true;
        router.replace('/doctor-dashboard');
        return;
      }
    }
    if (userData?.userType === 'admin') {
      hasNavigated.current = true;
      router.replace('/admin-dashboard');
      return;
    }
    if (userData?.userType === 'patient') {
      hasNavigated.current = true;
      router.replace('/patient-dashboard');
      return;
    }
  }, [user, userData, loading]);

  // Show loading screen while initializing or routing
  if (loading || hasNavigated.current) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // If not logged in, show the landing page
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <LandingPage />
      </SafeAreaView>
    );
  }

  // Fallback (should not be reached)
  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
}); 