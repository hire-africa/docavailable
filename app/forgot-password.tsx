import { FontAwesome } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
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
import { navigateToLogin, navigateToSignup } from '../utils/navigationUtils';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const maxWidth = isWeb ? 400 : width;

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { userType } = useLocalSearchParams<{ userType?: string }>();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleRequestReset = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!validateEmail(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await authService.forgotPassword(email.trim());
      setEmailSent(true);
      
      // Navigate to code verification page
      router.push({
        pathname: '/verify-reset-code',
        params: { email: email.trim(), userType }
      });
    } catch (error: any) {
      console.error('ForgotPassword: Error requesting reset:', error);
      Alert.alert('Error', error.message || 'Failed to send password reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    // Use router.back() to return to the previous screen in the navigation stack
    router.back();
  };

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
            <Text style={styles.title}>Forgot Password</Text>
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
              Enter your email address and we'll send you a link to reset your password.
            </Text>

            <View style={styles.formContainer}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email address"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />

              <TouchableOpacity
                style={[styles.resetButton, loading && styles.resetButtonDisabled]}
                onPress={handleRequestReset}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.resetButtonText}>Send Reset Link</Text>
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

            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>
                Don't have an account?{' '}
                <Text 
                  style={styles.linkText}
                  onPress={() => navigateToSignup({ userType })}
                >
                  Sign up
                </Text>
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
    marginBottom: 32,
    paddingHorizontal: 20,
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
  input: Platform.OS === 'web' ? {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#FFFFFF',
    marginBottom: 24,
    outlineStyle: 'none',
  } : {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#FFFFFF',
    marginBottom: 24,
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
  infoContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
  },
  linkText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
}); 