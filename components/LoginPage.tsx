import { FontAwesome } from '@expo/vector-icons';
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
import authService from '../services/authService';
import { navigateToDashboard, navigateToForgotPassword, navigateToSignup } from '../utils/navigationUtils';
import NativeGoogleSignIn from './NativeGoogleSignIn';

const { width } = Dimensions.get('window');

const INPUT_WIDTH_MOBILE = width * 0.8;
const INPUT_WIDTH_WEB = 320;

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showGoogleAuth, setShowGoogleAuth] = useState(false);
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
                    router.replace('/'); // fallback
                }
            } else {
                console.error('LoginPage: No user data in response:', authState);
                Alert.alert('Login Failed', 'User data not found.');
                await authService.signOut();
            }
        } catch (error: any) {
            console.error('LoginPage: Login error:', error);
            
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

    const handleGoogleSignIn = () => {
        console.log('🔐 Opening Google Auth WebView');
        setShowGoogleAuth(true);
    };

    const handleGoogleAuthSuccess = async (user: any, token: string) => {
        console.log('🔐 Google Auth Success:', { user, token });
        setShowGoogleAuth(false);
        setLoading(true);
        
        try {
            // Check if user needs to sign up
            if (user.needsSignup && user.signupData) {
                console.log('🔐 User needs signup, redirecting with Google data:', user.signupData);
                
                // Navigate to the correct signup page based on user type
                const signupParams = {
                    googleData: JSON.stringify(user.signupData.googleData),
                    userType: user.signupData.userType,
                    source: 'google'
                };
                
                // Determine the correct signup page based on user type
                let signupPath = '/signup'; // Default fallback
                switch (user.signupData.userType) {
                    case 'patient':
                        signupPath = '/patient-signup';
                        break;
                    case 'doctor':
                        signupPath = '/doctor-signup';
                        break;
                    case 'admin':
                        signupPath = '/admin-signup';
                        break;
                    default:
                        console.warn('🔐 Unknown user type, using default signup page:', user.signupData.userType);
                        signupPath = '/signup';
                }
                
                console.log('🔐 Redirecting to signup page:', signupPath, 'with params:', signupParams);
                
                // Navigate to the appropriate signup page with pre-filled data
                router.push({
                    pathname: signupPath,
                    params: signupParams
                });
                return;
            }
            
            // User exists in database, proceed with normal login flow
            // Navigate to appropriate dashboard based on user type
            if (user.user_type === 'admin') {
                navigateToDashboard('admin', true);
            } else if (user.user_type === 'doctor') {
                if (user.status === 'pending') {
                    Alert.alert('Account Pending', 'Your account is awaiting admin approval.');
                    await authService.signOut();
                    return;
                }
                if (user.status === 'suspended') {
                    Alert.alert('Account Suspended', 'Your account has been suspended. Please contact support.');
                    await authService.signOut();
                    return;
                }
                navigateToDashboard('doctor', true);
            } else if (user.user_type === 'patient') {
                navigateToDashboard('patient', true);
            } else {
                router.replace('/'); // fallback
            }
        } catch (error) {
            console.error('🔐 Error after Google Auth success:', error);
            Alert.alert('Error', 'Failed to complete login process. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleAuthError = (error: string) => {
        console.error('🔐 Google Auth Error:', error);
        setShowGoogleAuth(false);
        
        // Don't show alert for user cancellation
        if (error.includes('cancelled') || 
            error.includes('No user data received from Google') ||
            error.includes('SIGN_IN_CANCELLED')) {
            console.log('🔐 User cancelled Google sign-in, not showing error alert');
            return;
        }
        
        Alert.alert('Google Sign-In Error', error);
    };

    const handleGoogleAuthClose = () => {
        console.log('🔐 Google Auth WebView closed');
        setShowGoogleAuth(false);
    };

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
                            {userType === 'doctor' ? 'Doctor' : 'Patient'} Account
                        </Text>
                    </View>
                )}

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
                        <TouchableOpacity
                            onPress={() => navigateToForgotPassword({ userType })}
                        >
                            <Text style={styles.linkText}>Forgot Password?</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.signupContainer}>
                        <Text style={styles.signupText}>Don&apos;t have an account? </Text>
                        <TouchableOpacity
                            onPress={() => navigateToSignup({ userType })}
                        >
                            <Text style={styles.signupLink}>Sign Up</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Native Google Sign-In Modal */}
            <NativeGoogleSignIn
                visible={showGoogleAuth}
                onClose={handleGoogleAuthClose}
                onSuccess={handleGoogleAuthSuccess}
                onError={handleGoogleAuthError}
                userType={userType as 'patient' | 'doctor' | 'admin'}
            />
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
    userTypeIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 15,
        marginBottom: 20,
        alignSelf: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    userTypeText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: 'bold',
        color: '#4CAF50',
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