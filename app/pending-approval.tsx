import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import authService from '@/services/authService';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback } from 'react';
import {
    BackHandler,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const PendingApproval: React.FC = () => {
  const { user, userData, refreshUserData } = useAuth();

  // Prevent back button navigation
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // Prevent back navigation - users must use logout button
        return true; // Return true to prevent default back behavior
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => subscription.remove();
    }, [])
  );

  const handleRefresh = async () => {
    // console.log('PendingApproval: Manual refresh requested');
    await refreshUserData();
  };

  const handleGoHome = async () => {
    // console.log('PendingApproval: Signing out and navigating to home page');
    try {
      await authService.signOut();
      router.replace('/');
    } catch (error) {
      console.error('Error signing out:', error);
      // Fallback: try to navigate anyway
      router.replace('/');
    }
  };

  return (
    <View style={styles.outerContainer}>
      {/* Logo in top left */}
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>DocAvailable</Text>
      </View>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>Account Pending Approval</ThemedText>
        <ThemedText style={styles.message}>
          Your doctor account has been created and is awaiting admin approval.
          You will be automatically redirected once your account is approved.
        </ThemedText>
        {/* Debug output */}
        <View style={{ marginBottom: 16, alignItems: 'center' }}>
          <ThemedText>Status: {userData?.status?.toString() ?? 'undefined'}</ThemedText>
          <ThemedText>UserType: {userData?.userType ?? 'undefined'}</ThemedText>
          <ThemedText>Email: {userData?.email ?? 'undefined'}</ThemedText>
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={handleRefresh}>
            <Text style={styles.buttonText}>Refresh Status</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={handleGoHome}>
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>Go to Home Page</Text>
          </TouchableOpacity>
        </View>
      </ThemedView>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  logoContainer: {
    position: 'absolute',
    top: 32,
    left: 24,
    zIndex: 2,
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    letterSpacing: 1,
    marginTop: 40,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
    color: '#4CAF50',
  },
  message: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 25,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    color: '#4CAF50',
  },
});

export default PendingApproval; 