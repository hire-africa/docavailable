import { FontAwesome } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import React, { useState } from 'react';
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
import authService from '../services/authService';

const { width } = Dimensions.get('window');

const INPUT_WIDTH_MOBILE = width * 0.8;
const INPUT_WIDTH_WEB = 320;

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            const authState = await authService.signIn(email, password);
            // console.log('Login successful');
            
            if (authState.data && authState.data.user) {
                if (authState.data.user.user_type === 'admin') {
                    router.replace('/admin-dashboard');
                } else if (authState.data.user.user_type === 'doctor') {
                    if (authState.data.user.status !== 'approved') {
                        Alert.alert('Account Pending', 'Your account is awaiting admin approval.');
                        await authService.signOut();
                        return;
                    }
                    router.replace('/doctor-dashboard');
                } else if (authState.data.user.user_type === 'patient') {
                    router.replace('/patient-dashboard');
                } else {
                    router.replace('/'); // fallback
                }
            } else {
                Alert.alert('Login Failed', 'User data not found.');
                await authService.signOut();
            }
        } catch (error: any) {
            console.error('Login error:', error);
            
            // Enhanced error handling with detailed messages and suggestions
            let errorMessage = 'Login failed. Please try again.';
            let errorTitle = 'Login Failed';
            let errorSuggestion = '';
            
            // Check if we have detailed error information from the backend
            if (error.response?.data) {
                const errorData = error.response.data;
                errorMessage = errorData.message || errorMessage;
                
                // Set title based on error type
                if (errorData.error_type) {
                    switch (errorData.error_type) {
                        case 'validation_error':
                            errorTitle = 'Validation Error';
                            break;
                        case 'email_not_found':
                            errorTitle = 'Email Not Found';
                            break;
                        case 'invalid_password':
                            errorTitle = 'Invalid Password';
                            break;
                        case 'account_suspended':
                            errorTitle = 'Account Suspended';
                            break;
                        case 'account_pending':
                            errorTitle = 'Account Pending';
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

    const handleGoogleSignIn = async () => {
        setLoading(true);
        try {
            // TODO: Implement Google Sign-In
            // This requires installing @expo/google-sign-in and configuring Google OAuth
            // For now, show a message that this feature is not yet implemented
            
            Alert.alert(
                'Google Sign-In Not Available',
                'Google sign-in is not yet implemented. Please use email and password to sign in.',
                [
                    {
                        text: 'OK',
                        onPress: () => setLoading(false)
                    }
                ]
            );
            
            // Uncomment the following code when Google sign-in is implemented:
            /*
            const authState = await authService.signInWithGoogle(idToken);
            // console.log('Google login successful');
            
            if (authState.user) {
                if (authState.user.user_type === 'admin') {
                    router.replace('/admin-dashboard');
                } else if (authState.user.user_type === 'doctor') {
                    if (authState.user.status !== 'approved') {
                        Alert.alert('Account Pending', 'Your account is awaiting admin approval.');
                        await authService.signOut();
                        return;
                    }
                    router.replace('/doctor-dashboard');
                } else if (authState.user.user_type === 'patient') {
                    router.replace('/patient-dashboard');
                } else {
                    router.replace('/'); // fallback
                }
            } else {
                Alert.alert('Login Failed', 'User data not found.');
                await authService.signOut();
            }
            */
        } catch (error: any) {
            console.error('Google login error:', error);
            
            // Enhanced Google sign-in error handling
            let errorMessage = 'Failed to sign in with Google. Please try again.';
            let errorTitle = 'Google Login Failed';
            let errorSuggestion = '';
            
            // Check if we have detailed error information from the backend
            if (error.response?.data) {
                const errorData = error.response.data;
                errorMessage = errorData.message || errorMessage;
                
                if (errorData.error_type) {
                    switch (errorData.error_type) {
                        case 'invalid_google_token':
                            errorTitle = 'Invalid Google Token';
                            break;
                        case 'google_verification_failed':
                            errorTitle = 'Google Verification Failed';
                            break;
                        case 'account_suspended':
                            errorTitle = 'Account Suspended';
                            break;
                        case 'account_pending':
                            errorTitle = 'Account Pending';
                            break;
                        default:
                            errorTitle = 'Google Login Error';
                    }
                }
                
                if (errorData.suggestion) {
                    errorSuggestion = errorData.suggestion;
                }
            } else if (error.message) {
                // Fallback to message-based error handling
                if (error.message.includes('Firebase configuration not available')) {
                    errorMessage = 'Google authentication is not configured. Please contact support.';
                    errorSuggestion = 'This is a configuration issue. Please contact our support team.';
                } else if (error.message.includes('Google sign-in was cancelled')) {
                    errorMessage = 'Google sign-in was cancelled.';
                    errorSuggestion = 'You can try signing in again or use email/password login.';
                } else if (error.message.includes('Firebase Auth not initialized')) {
                    errorMessage = 'Authentication service is not ready. Please try again.';
                    errorSuggestion = 'Please wait a moment and try again.';
                } else if (error.message.includes('Google authentication failed')) {
                    errorMessage = 'Google authentication failed. Please check your internet connection and try again.';
                    errorSuggestion = 'Check your internet connection and try again.';
                } else if (error.message.includes('Network error')) {
                    errorMessage = 'Network error during Google sign-in. Please check your internet connection.';
                    errorTitle = 'Network Error';
                    errorSuggestion = 'Check your internet connection and try again.';
                } else if (error.message.includes('Request timed out')) {
                    errorMessage = 'Google sign-in request timed out. Please try again.';
                    errorTitle = 'Timeout Error';
                    errorSuggestion = 'Check your internet connection and try again.';
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

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Welcome Back</Text>
                <Text style={styles.subtitle}>Sign in to your account</Text>

                <View style={styles.form}>
                    <View style={styles.inputContainer}>
                        <FontAwesome name="envelope" size={20} color="#666" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            placeholderTextColor="#000"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <FontAwesome name="lock" size={20} color="#666" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            placeholderTextColor="#000"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.loginButtonText}>Sign In</Text>
                        )}
                    </TouchableOpacity>

                    {/* Divider */}
                    <View style={styles.dividerContainer}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>or</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    {/* Google Sign-In Button */}
                    <TouchableOpacity
                        style={styles.googleButton}
                        onPress={handleGoogleSignIn}
                        disabled={loading}
                    >
                        <View style={styles.googleButtonContent}>
                            <View style={styles.googleIcon}>
                                <Text style={styles.googleIconText}>G</Text>
                            </View>
                            <Text style={styles.googleButtonText}>Continue with Google</Text>
                        </View>
                    </TouchableOpacity>

                    <View style={styles.linksContainer}>
                        <Link href="/forgot-password" asChild>
                            <TouchableOpacity>
                                <Text style={styles.linkText}>Forgot Password?</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>

                    <View style={styles.signupContainer}>
                        <Text style={styles.signupText}>Don&apos;t have an account? </Text>
                        <Link href="/signup" asChild>
                            <TouchableOpacity>
                                <Text style={styles.signupLink}>Sign Up</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 40,
    },
    form: {
        width: '100%',
        alignItems: 'center',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        borderRadius: 25,
        marginBottom: 16,
        paddingHorizontal: 20,
        ...Platform.select({
            web: {
                width: INPUT_WIDTH_WEB,
            },
            default: {
                width: INPUT_WIDTH_MOBILE,
            }
        }),
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        paddingVertical: 16,
        fontSize: 16,
        color: '#333',
    },
    loginButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 16,
        borderRadius: 25,
        alignItems: 'center',
        marginTop: 8,
        ...Platform.select({
            web: {
                width: INPUT_WIDTH_WEB,
            },
            default: {
                width: INPUT_WIDTH_MOBILE,
            }
        }),
    },
    loginButtonDisabled: {
        backgroundColor: '#B0B0B0',
    },
    loginButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
        ...Platform.select({
            web: {
                width: INPUT_WIDTH_WEB,
            },
            default: {
                width: INPUT_WIDTH_MOBILE,
            }
        }),
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E0E0E0',
    },
    dividerText: {
        marginHorizontal: 16,
        color: '#666',
        fontSize: 14,
        fontWeight: '500',
    },
    googleButton: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 16,
        borderRadius: 25,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        marginBottom: 8,
        ...Platform.select({
            web: {
                width: INPUT_WIDTH_WEB,
            },
            default: {
                width: INPUT_WIDTH_MOBILE,
            }
        }),
    },
    googleButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    googleIcon: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#4CAF50',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    googleIconText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    googleButtonText: {
        color: '#333',
        fontSize: 16,
        fontWeight: '500',
    },
    linksContainer: {
        marginTop: 20,
        alignItems: 'center',
    },
    linkText: {
        color: '#4CAF50',
        fontSize: 16,
    },
    signupContainer: {
        flexDirection: 'row',
        marginTop: 40,
        alignItems: 'center',
    },
    signupText: {
        color: '#666',
        fontSize: 16,
    },
    signupLink: {
        color: '#4CAF50',
        fontSize: 16,
        fontWeight: 'bold',
    },
}); 