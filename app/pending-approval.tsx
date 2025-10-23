import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import authService from '@/services/authService';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback } from 'react';
import {
    BackHandler,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const PendingApproval: React.FC = () => {
  const { user, userData } = useAuth();

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
      {/* Logo in top center */}
      <View style={styles.logoContainer}>
        <Image 
          source={require('../assets/images/DA logo green.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>Account Pending Approval</ThemedText>
        <ThemedText style={styles.message}>
          Your doctor account has been created and is awaiting admin approval.
          You will receive an email at {userData?.email ?? 'your registered email'} once your account is approved.
        </ThemedText>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={handleGoHome}>
            <Text style={styles.buttonText}>Go to Home Page</Text>
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
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  logo: {
    width: 140,
    height: 60,
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