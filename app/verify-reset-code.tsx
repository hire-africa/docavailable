import { FontAwesome } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
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
import { navigateToLogin } from '../utils/navigationUtils';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const maxWidth = isWeb ? 400 : width;

export default function VerifyResetCode() {
  const { email, userType } = useLocalSearchParams<{ email: string; userType?: string }>();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<TextInput[]>([]);

  useEffect(() => {
    if (!email) {
      Alert.alert('Error', 'Email address is required', [
        { text: 'OK', onPress: () => router.replace('/forgot-password') }
      ]);
    }
  }, [email]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleCodeChange = (value: string, index: number) => {
    if (value.length > 1) return; // Prevent multiple characters
    
    // Clean the value - remove any non-numeric characters
    const cleanValue = value.replace(/[^0-9]/g, '');
    
    const newCode = [...code];
    newCode[index] = cleanValue;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits are entered - use newCode directly
    if (newCode.every(digit => digit !== '') && newCode.length === 6 && !loading) {
      // Use the newCode directly to avoid state timing issues
      setTimeout(() => {
        const fullCode = newCode.join('');
        console.log('Auto-submitting with code:', fullCode, 'length:', fullCode.length);
        if (fullCode.length === 6) {
          handleVerifyCodeWithCode(fullCode);
        }
      }, 150);
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = async () => {
    const fullCode = code.join('');
    await handleVerifyCodeWithCode(fullCode);
  };

  const handleVerifyCodeWithCode = async (codeToVerify: string) => {
    console.log('Verifying code:', codeToVerify, 'length:', codeToVerify.length);
    console.log('Code characters:', codeToVerify.split('').map(c => `'${c}'`).join(', '));
    
    if (codeToVerify.length !== 6) {
      console.error('Code length is not 6:', codeToVerify.length);
      return;
    }

    setLoading(true);
    try {
      console.log('Sending to API - email:', email, 'code:', codeToVerify);
      await authService.verifyResetCode(email, codeToVerify);
      
      // Navigate to password reset page with the verified code
      router.push({
        pathname: '/reset-password-with-code',
        params: { email, code: codeToVerify, userType }
      });
    } catch (error: any) {
      console.error('VerifyResetCode: Error verifying code:', error);
      Alert.alert('Error', error.message || 'Invalid verification code. Please try again.');
      
      // Clear the code inputs
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;

    setResendLoading(true);
    try {
      await authService.forgotPassword(email);
      setResendCooldown(60); // 60 second cooldown
      Alert.alert('Success', 'A new verification code has been sent to your email address.');
    } catch (error: any) {
      console.error('VerifyResetCode: Error resending code:', error);
      Alert.alert('Error', error.message || 'Failed to resend code. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.replace('/login');
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
            <Text style={styles.title}>Verify Code</Text>
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
              <FontAwesome name="key" size={48} color="#4CAF50" />
            </View>

            <Text style={styles.subtitle}>
              Enter the 6-digit verification code sent to:
            </Text>
            
            <Text style={styles.emailText}>{email}</Text>

            <View style={styles.codeContainer}>
              {code.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    if (ref) inputRefs.current[index] = ref;
                  }}
                  style={[
                    styles.codeInput,
                    digit && styles.codeInputFilled
                  ]}
                  value={digit}
                  onChangeText={(value) => handleCodeChange(value, index)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                  keyboardType="numeric"
                  maxLength={1}
                  selectTextOnFocus
                  editable={!loading}
                />
              ))}
            </View>

            <TouchableOpacity
              style={[styles.verifyButton, loading && styles.verifyButtonDisabled]}
              onPress={handleVerifyCode}
              disabled={loading || code.some(digit => digit === '')}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.verifyButtonText}>Verify Code</Text>
              )}
            </TouchableOpacity>

            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn't receive the code?</Text>
              <TouchableOpacity
                style={[styles.resendButton, resendCooldown > 0 && styles.resendButtonDisabled]}
                onPress={handleResendCode}
                disabled={resendLoading || resendCooldown > 0}
              >
                {resendLoading ? (
                  <ActivityIndicator color="#4CAF50" size="small" />
                ) : (
                  <Text style={styles.resendButtonText}>
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.backToLoginButton}
              onPress={handleBackToLogin}
              disabled={loading}
            >
              <Text style={styles.backToLoginText}>Back to Login</Text>
            </TouchableOpacity>
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
    marginBottom: 8,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 32,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  codeInput: {
    width: 45,
    height: 55,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    backgroundColor: '#FFFFFF',
  },
  codeInputFilled: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  verifyButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginBottom: 24,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  verifyButtonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  resendText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  resendButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  resendButtonDisabled: {
    opacity: 0.5,
  },
  resendButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
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
});
