import { FontAwesome } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import authService from '../services/authService';
import SuccessModal from '../components/SuccessModal';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const maxWidth = isWeb ? 400 : width;

export default function ResetPasswordWithCode() {
  const params = useLocalSearchParams();
  const email = params.email as string;
  const code = params.code as string;
  const userType = params.userType as string;
  
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const validatePassword = (password: string) => {
    return password.length >= 8;
  };

  const validateForm = () => {
    if (!password.trim()) {
      Alert.alert('Error', 'Please enter a new password');
      return false;
    }

    if (!validatePassword(password)) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return false;
    }

    if (password !== passwordConfirmation) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }

    return true;
  };

  const handleResetPassword = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await authService.resetPasswordWithCode(email, code, password, passwordConfirmation);
      
      // Clear form and show success modal
      setPassword('');
      setPasswordConfirmation('');
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('ResetPasswordWithCode: Error resetting password:', error);
      Alert.alert('Error', error.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.replace('/login');
  };

  if (!email || !code) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <FontAwesome name="exclamation-triangle" size={48} color="#FF6B6B" />
          <Text style={styles.errorTitle}>Invalid Reset Session</Text>
          <Text style={styles.errorMessage}>
            This password reset session is invalid. Please start the process again.
          </Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => router.replace('/forgot-password')}
          >
            <Text style={styles.errorButtonText}>Start Over</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={handleBackToLogin}
            >
              <FontAwesome name="arrow-left" size={20} color="#4CAF50" />
            </TouchableOpacity>
            <Text style={styles.title}>Reset Password</Text>
            <View style={{ width: 44 }} />
          </View>

          {/* User Type Indicator */}
          {userType && (
            <View style={styles.userTypeIndicator}>
              <FontAwesome 
                name={userType === 'doctor' ? 'user-md' : 'user'} 
                size={16} 
                color="#4CAF50" 
              />
              <Text style={styles.userTypeText}>
                {userType === 'doctor' ? 'Doctor' : 'Patient'} Account
              </Text>
            </View>
          )}

          {/* Main Content */}
          <View style={styles.mainContent}>
            <View style={styles.iconContainer}>
              <FontAwesome name="lock" size={48} color="#4CAF50" />
            </View>

            <Text style={styles.subtitle}>
              Create a new password for your account.
            </Text>

            <Text style={styles.emailText}>Account: {email}</Text>

            <View style={styles.formContainer}>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter new password"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <FontAwesome 
                    name={showPassword ? "eye-slash" : "eye"} 
                    size={20} 
                    color="#999" 
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Confirm New Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Confirm new password"
                  placeholderTextColor="#999"
                  value={passwordConfirmation}
                  onChangeText={setPasswordConfirmation}
                  secureTextEntry={!showPasswordConfirmation}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPasswordConfirmation(!showPasswordConfirmation)}
                >
                  <FontAwesome 
                    name={showPasswordConfirmation ? "eye-slash" : "eye"} 
                    size={20} 
                    color="#999" 
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.requirementsContainer}>
                <Text style={styles.requirementsTitle}>Password Requirements:</Text>
                <Text style={[styles.requirement, password.length >= 8 && styles.requirementMet]}>
                  • At least 8 characters long
                </Text>
                <Text style={[styles.requirement, password === passwordConfirmation && password.length > 0 && styles.requirementMet]}>
                  • Passwords match
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.resetButton, loading && styles.resetButtonDisabled]}
                onPress={handleResetPassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.resetButtonText}>Reset Password</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backToLoginButton}
                onPress={handleBackToLogin}
                disabled={loading}
              >
                <Text style={styles.backToLoginText}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        title="🎉 Password Reset Successful!"
        message="Your password has been updated successfully. You can now log in with your new password."
        buttonText="Continue to Login"
        onPress={() => {
          setShowSuccessModal(false);
          // Go directly to login and clear the stack
          router.push({
            pathname: '/login',
            params: { resetStack: true }
          });
        }}
        icon="check-circle"
        iconColor="#4CAF50"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    maxWidth: maxWidth,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  userTypeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2F7',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginHorizontal: 20,
    marginTop: 16,
    alignSelf: 'center',
  },
  userTypeText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  emailText: {
    fontSize: 14,
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 32,
    fontWeight: '600',
  },
  formContainer: {
    width: '100%',
    maxWidth: 320,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  eyeButton: {
    padding: 12,
  },
  requirementsContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  requirement: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  requirementMet: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  resetButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  resetButtonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backToLoginButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  backToLoginText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  errorButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
