import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
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
import { GOOGLE_API_ENDPOINTS, GOOGLE_AUTH_ERRORS, GOOGLE_OAUTH_CONFIG } from '../config/googleOAuth';
import authService from '../services/authService';
import { navigateToDashboard, navigateToForgotPassword, navigateToSignup } from '../utils/navigationUtils';

const { width } = Dimensions.get('window');

const INPUT_WIDTH_MOBILE = width * 0.8;
const INPUT_WIDTH_WEB = 320;

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
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

    const handleGoogleSignIn = async () => {
        setLoading(true);
        try {
            // Check if Google OAuth is configured
            if (!GOOGLE_OAUTH_CONFIG.clientId || GOOGLE_OAUTH_CONFIG.clientId === 'YOUR_GOOGLE_CLIENT_ID') {
                Alert.alert(
                    'Google OAuth Not Configured',
                    'Please configure your Google OAuth credentials in the environment variables.',
                    [{ text: 'OK' }]
                );
                return;
            }

            // Google OAuth configuration - use appropriate redirect URI based on platform
            const redirectUri = Platform.OS === 'web' 
                ? 'https://docavailable-3vbdv.ondigitalocean.app'
                : 'com.docavailable.app://oauth2redirect';
            
            console.log('Using redirect URI:', redirectUri);

            console.log('Platform Detection:', {
                PlatformOS: Platform.OS,
                windowLocation: typeof window !== 'undefined' ? window.location.origin : 'undefined',
                isWeb: Platform.OS === 'web'
            });

            console.log('Google OAuth Config:', {
                clientId: GOOGLE_OAUTH_CONFIG.clientId,
                redirectUri,
                platform: Platform.OS,
                scopes: GOOGLE_OAUTH_CONFIG.scopes
            });

            const requestConfig = {
                clientId: GOOGLE_OAUTH_CONFIG.clientId,
                scopes: GOOGLE_OAUTH_CONFIG.scopes,
                redirectUri,
                responseType: AuthSession.ResponseType.Code,
                extraParams: {
                    access_type: 'offline',
                },
            };

            console.log('AuthRequest Config:', requestConfig);

            const request = new AuthSession.AuthRequest(requestConfig);

            console.log('OAuth Discovery Config:', GOOGLE_OAUTH_CONFIG.discovery);
            
            const result = await request.promptAsync(GOOGLE_OAUTH_CONFIG.discovery);

            console.log('Google OAuth Result:', {
                type: result.type,
                params: (result as any).params,
                error: (result as any).error,
                errorCode: (result as any).errorCode
            });

            if (result.type === 'success') {
                // Exchange authorization code for tokens
                const tokenResponse = await AuthSession.exchangeCodeAsync(
                    {
                        clientId: GOOGLE_OAUTH_CONFIG.clientId,
                        clientSecret: GOOGLE_OAUTH_CONFIG.clientSecret,
                        code: result.params.code,
                        redirectUri,
                        extraParams: {
                            code_verifier: request.codeVerifier,
                        },
                    },
                    GOOGLE_OAUTH_CONFIG.discovery
                );

                // Get user info from Google
                const userInfoResponse = await fetch(
                    `${GOOGLE_API_ENDPOINTS.userInfo}?access_token=${tokenResponse.accessToken}`
                );
                
                if (!userInfoResponse.ok) {
                    throw new Error(GOOGLE_AUTH_ERRORS.USER_INFO_FAILED);
                }
                
                const userInfo = await userInfoResponse.json();

                // Create a JWT-like token for your backend
                const googleToken = {
                    sub: userInfo.id,
                    email: userInfo.email,
                    name: userInfo.name,
                    given_name: userInfo.given_name,
                    family_name: userInfo.family_name,
                    picture: userInfo.picture,
                };

                // Send to your backend
                const authState = await authService.signInWithGoogle(JSON.stringify(googleToken));
                
                if (authState.success && authState.data.user) {
                    const user = authState.data.user;
                    
                    if (user.user_type === 'admin') {
                        router.replace('/admin-dashboard');
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
                    router.replace('/doctor-dashboard');
                    } else if (user.user_type === 'patient') {
                        router.replace('/patient-dashboard');
                    } else {
                        router.replace('/');
                    }
                } else {
                    Alert.alert('Login Failed', 'Google authentication failed.');
                    await authService.signOut();
                }
            } else if (result.type === 'error') {
                // Handle OAuth errors
                const errorResult = result as any;
                console.error('Google OAuth Error Details:', {
                    error: errorResult.error,
                    errorCode: errorResult.errorCode,
                    params: errorResult.params,
                    fullResult: result
                });
                
                let errorMessage = 'Google sign-in failed. Please try again.';
                let errorTitle = 'Google Sign-In Error';
                
                // More specific error handling
                if (errorResult.errorCode === '400') {
                    errorMessage = `Invalid Google OAuth configuration. Error: ${errorResult.error || 'Unknown 400 error'}`;
                    errorTitle = 'Configuration Error';
                } else if (errorResult.errorCode === '403') {
                    errorMessage = 'Google sign-in is not enabled or configured properly.';
                    errorTitle = 'Access Denied';
                } else if (errorResult.errorCode === 'redirect_uri_mismatch') {
                    errorMessage = 'Redirect URI mismatch. Please check your Google Cloud Console redirect URIs.';
                    errorTitle = 'Redirect URI Error';
                } else if (errorResult.error === 'invalid_request') {
                    errorMessage = `Invalid request: ${errorResult.errorCode || 'Unknown error'}`;
                    errorTitle = 'Invalid Request';
                } else if (errorResult.error === 'unauthorized_client') {
                    errorMessage = 'Client not authorized for this request type.';
                    errorTitle = 'Unauthorized Client';
                }
                
                console.error('Final Error Message:', errorMessage);
                Alert.alert(errorTitle, errorMessage);
            } else {
                // User cancelled the sign-in
                console.log('Google sign-in was cancelled');
            }
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
                        case 'user_not_registered':
                            // Handle unregistered user - redirect to patient signup
                            errorTitle = 'Account Not Found';
                            errorMessage = errorData.message || 'This email is not registered.';
                            errorSuggestion = errorData.suggestion || 'Please complete the patient registration process.';
                            
                            // Store Google user data for pre-filling signup form
                            if (errorData.google_user_data) {
                                try {
                                    if (Platform.OS === 'web' && typeof window !== 'undefined') {
                                        sessionStorage.setItem('google_user_data', JSON.stringify(errorData.google_user_data));
                                    } else {
                                        await AsyncStorage.setItem('google_user_data', JSON.stringify(errorData.google_user_data));
                                    }
                                } catch (storageError) {
                                    console.warn('Could not store Google user data:', storageError);
                                }
                            }
                            
                            // Show alert and redirect to patient signup
                            Alert.alert(
                                errorTitle,
                                `${errorMessage}\n\nSuggestion: ${errorSuggestion}`,
                                [
                                    {
                                        text: 'Sign Up',
                                        onPress: () => router.push('/patient-signup')
                                    },
                                    {
                                        text: 'Cancel',
                                        style: 'cancel'
                                    }
                                ]
                            );
                            return; // Exit early to avoid showing another alert
                            
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