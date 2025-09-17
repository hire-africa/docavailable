import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { GOOGLE_OAUTH_CONFIG } from '../config/googleOAuth';
import authService from '../services/authService';
import { navigateToDashboard, navigateToForgotPassword, navigateToSignup } from '../utils/navigationUtils';
import GoogleOAuthWebView from './GoogleOAuthWebView';

const { width } = Dimensions.get('window');

const INPUT_WIDTH_MOBILE = width * 0.8;
const INPUT_WIDTH_WEB = 320;

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showWebView, setShowWebView] = useState(false);
    const { userType } = useLocalSearchParams<{ userType?: string }>();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            console.log('LoginPage: Attempting login with:', { email, password: '***' });
            const authState = await authService.signIn(email, password);
            console.log('LoginPage: Login response:', authState);
            
            if (authState.data && authState.data.user) {
                console.log('LoginPage: User data found:', authState.data.user);
                if (authState.data.user.user_type === 'admin') {
                    navigateToDashboard('admin', true);
                } else if (authState.data.user.user_type === 'doctor') {
                    if (authState.data.user.status === 'pending') {
                        Alert.alert('Account Pending', 'Your account is awaiting admin approval.');
                        await authService.signOut();
                        return;
                    }
                    if (authState.data.user.status === 'suspended') {
                        Alert.alert('Account Suspended', 'Your account has been suspended. Please contact support.');
                        await authService.signOut();
                        return;
                    }
                    navigateToDashboard('doctor', true);
                } else if (authState.data.user.user_type === 'patient') {
                    navigateToDashboard('patient', true);
                } else {
                    navigateToDashboard('patient', true);
                }
            } else {
                console.log('LoginPage: No user data in response');
                Alert.alert('Login Failed', 'Invalid credentials. Please try again.');
            }
        } catch (error: any) {
            console.error('LoginPage: Login error:', error);
            
            // Enhanced error handling
            let errorMessage = 'Login failed. Please try again.';
            let errorTitle = 'Login Error';
            let errorSuggestion = '';
            
            // Check if we have detailed error information from the backend
            if (error.response?.data) {
                const errorData = error.response.data;
                errorMessage = errorData.message || errorMessage;
                
                if (errorData.error_type) {
                    switch (errorData.error_type) {
                        case 'invalid_credentials':
                            errorTitle = 'Invalid Credentials';
                            break;
                        case 'account_locked':
                            errorTitle = 'Account Locked';
                            break;
                        case 'email_not_verified':
                            errorTitle = 'Email Not Verified';
                            break;
                        case 'account_suspended':
                            errorTitle = 'Account Suspended';
                            break;
                        case 'database_error':
                            errorTitle = 'Database Error';
                            break;
                        case 'authentication_error':
                            errorTitle = 'Authentication Error';
                            break;
                        case 'connection_error':
                            errorTitle = 'Connection Error';
                            break;
                        case 'token_error':
                            errorTitle = 'Token Error';
                            break;
                        case 'unexpected_error':
                            errorTitle = 'Unexpected Error';
                            break;
                        default:
                            errorTitle = 'Login Error';
                    }
                }
                
                // Add suggestion if available
                if (errorData.suggestion) {
                    errorSuggestion = errorData.suggestion;
                }
            } else if (error.message) {
                // Fallback to message-based error handling
                if (error.message.includes('Invalid email or password')) {
                    errorMessage = 'Invalid email or password. Please check your credentials and try again.';
                    errorSuggestion = 'Make sure caps lock is off and try again.';
                } else if (error.message.includes('Network error') || error.message.includes('Cannot connect to server')) {
                    errorMessage = 'Network error. Please check your internet connection and try again.';
                    errorTitle = 'Connection Error';
                    errorSuggestion = 'Check your internet connection and try again.';
                } else if (error.message.includes('Request timed out')) {
                    errorMessage = 'Request timed out. Please check your internet connection and try again.';
                    errorTitle = 'Timeout Error';
                    errorSuggestion = 'Check your internet connection and try again.';
                } else if (error.message.includes('Server error')) {
                    errorMessage = 'Server error. Please try again later or contact support if the problem persists.';
                    errorTitle = 'Server Error';
                    errorSuggestion = 'If this problem persists, please contact support.';
                } else if (error.message.includes('Service temporarily unavailable')) {
                    errorMessage = 'Service temporarily unavailable. Please try again later.';
                    errorTitle = 'Service Unavailable';
                    errorSuggestion = 'Please try again in a few minutes.';
                } else if (error.message.includes('Validation failed')) {
                    errorMessage = 'Please check your email format and ensure all fields are filled correctly.';
                    errorTitle = 'Validation Error';
                    errorSuggestion = 'Make sure your email is in the correct format: example@domain.com';
                } else {
                    errorMessage = error.message;
                }
            }
            
            // Show error with suggestion if available
            if (errorSuggestion) {
                Alert.alert(errorTitle, `${errorMessage}\n\nSuggestion: ${errorSuggestion}`);
            } else {
                Alert.alert(errorTitle, errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = () => {
        // Check if Google OAuth is configured
        if (!GOOGLE_OAUTH_CONFIG.clientId || GOOGLE_OAUTH_CONFIG.clientId === 'YOUR_GOOGLE_CLIENT_ID') {
            Alert.alert(
                'Google OAuth Not Configured',
                'Please configure your Google OAuth credentials in the environment variables.',
                [{ text: 'OK' }]
            );
            return;
        }

        // Show WebView for Google OAuth
        setShowWebView(true);
    };

    if (showWebView) {
        return (
            <GoogleOAuthWebView
                onClose={() => setShowWebView(false)}
                onSuccess={() => setShowWebView(false)}
            />
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Welcome Back</Text>
                <Text style={styles.subtitle}>Sign in to your account</Text>
                
                {userType && (
                    <View style={styles.userTypeIndicator}>
                        <FontAwesome 
                            name={userType === 'doctor' ? 'user-md' : 'user'} 
                            size={16}
                            color="#4CAF50"
                        />
                        <Text style={styles.userTypeText}>
                            {userType === 'doctor' ? 'Doctor' : 'Patient'} Login
                        </Text>
                    </View>
                )}

                <View style={styles.form}>
                    <View style={styles.inputContainer}>
                        <FontAwesome name="envelope" size={16} color="#666" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <FontAwesome name="lock" size={16} color="#666" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>

                    <TouchableOpacity
                        style={styles.forgotPassword}
                        onPress={navigateToForgotPassword}
                    >
                        <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.loginButton, loading && styles.disabledButton]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.loginButtonText}>Sign In</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>OR</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    <TouchableOpacity
                        style={[styles.googleButton, loading && styles.disabledButton]}
                        onPress={handleGoogleSignIn}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <FontAwesome name="google" size={16} color="#fff" style={styles.googleIcon} />
                                <Text style={styles.googleButtonText}>Continue with Google</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <View style={styles.signupContainer}>
                        <Text style={styles.signupText}>Don't have an account? </Text>
                        <TouchableOpacity onPress={navigateToSignup}>
                            <Text style={styles.signupLink}>Sign Up</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f2f5',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 30,
    },
    userTypeIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e8f5e8',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 20,
    },
    userTypeText: {
        marginLeft: 6,
        fontSize: 14,
        color: '#4CAF50',
        fontWeight: '600',
    },
    form: {
        width: Platform.OS === 'web' ? INPUT_WIDTH_WEB : INPUT_WIDTH_MOBILE,
        maxWidth: 400,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 8,
        marginBottom: 16,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        height: 48,
        fontSize: 16,
        color: '#333',
    },
    forgotPassword: {
        alignSelf: 'flex-end',
        marginBottom: 20,
    },
    forgotPasswordText: {
        color: '#4CAF50',
        fontSize: 14,
        fontWeight: '500',
    },
    loginButton: {
        backgroundColor: '#4CAF50',
        borderRadius: 8,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    disabledButton: {
        opacity: 0.6,
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#e0e0e0',
    },
    dividerText: {
        marginHorizontal: 16,
        color: '#666',
        fontSize: 14,
    },
    googleButton: {
        backgroundColor: '#4285F4',
        borderRadius: 8,
        height: 48,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    googleIcon: {
        marginRight: 8,
    },
    googleButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    signupContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    signupText: {
        color: '#666',
        fontSize: 14,
    },
    signupLink: {
        color: '#4CAF50',
        fontSize: 14,
        fontWeight: '600',
    },
});
