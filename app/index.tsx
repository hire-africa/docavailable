import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import LandingPage from '../components/LandingPage';
import { useAuth } from '../contexts/AuthContext';

export default function App() {
  const { user, userData, loading } = useAuth();

  useEffect(() => {
    console.log('App: useEffect triggered');
    console.log('App: Loading state:', loading);
    console.log('App: User:', user ? user.email : 'null');
    console.log('App: UserData:', userData);
    
    if (loading) {
      console.log('App: Still loading, returning early');
      return;
    }

    console.log('App: Loading finished, checking routing conditions...');

    if (!user) {
      console.log('App: No user, showing landing page');
      // Do NOT auto-redirect to /login
      // Show the landing page below
      return;
    }

    if (userData?.user_type === 'doctor') {
      console.log('App: User is a doctor, status:', userData.status);
      if (userData.status === 'pending') {
        console.log('App: Redirecting doctor to pending approval');
        router.replace('/pending-approval');
        return;
      }
      if (userData.status === 'approved') {
        console.log('App: Redirecting doctor to doctor dashboard');
        router.replace('/doctor-dashboard');
        return;
      }
    }
    if (userData?.user_type === 'admin') {
      console.log('App: Redirecting admin to admin dashboard');
      router.replace('/admin-dashboard');
      return;
    }
    if (userData?.user_type === 'patient') {
      console.log('App: Redirecting patient to patient dashboard');
      router.replace('/patient-dashboard');
      return;
    }

    console.log('App: No matching user type found, userData:', userData);
  }, [user, userData, loading]);

  // Show loading screen while initializing
  if (loading) {
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