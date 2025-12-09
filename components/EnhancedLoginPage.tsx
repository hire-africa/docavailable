import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
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
import AuthErrorHandler from '../utils/authErrorHandler';
import BiometricAuth from '../utils/biometricAuth';
import NativeGoogleSignIn from './NativeGoogleSignIn';

const { width } = Dimensions.get('window');

const INPUT_WIDTH_MOBILE = width * 0.8;
const INPUT_WIDTH_WEB = 320;

export default function EnhancedLoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showGoogleAuth, setShowGoogleAuth] = useState(false);
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const { userType } = useLocalSearchParams<{ userType?: string }>();

    // Check biometric availability on mount
    useEffect(() => {
        const checkBiometric = async () => {
            const available = await BiometricAuth.isAvailable();
            const enabled = await BiometricAuth.isEnabled();
            
            setBiometricAvailable(available);
            setBiometricEnabled(enabled);
        };

        checkBiometric();
    }, []);

    const handleLogin = async () => {
        if (!email || !password) {
            AuthErrorHandler.showError({
                message: 'Please fill in all fields'
            });
            return;
        }

        setLoading(true);
        try {
            console.log('EnhancedLoginPage: Attempting login with:', { email, password: '***' });
            const authState = await authService.signIn(email, password);
            
            if (authState.data && authState.data.user) {
                console.log('EnhancedLoginPage: Login successful');
                
                // Offer biometric setup for new users
                if (biometricAvailable && !biometricEnabled) {
                    BiometricAuth.showSetupPrompt(
                        async () => {
                            const enabled = await BiometricAuth.enable();
                            if (enabled) {
                                setBiometricEnabled(true);
                            }
                        },
                        () => {
                            // User skipped biometric setup
                        }
                    );
                }
                
                navigateToUserDashboard(authState.data.user);
            } else {
                throw new Error('User data not found in response');
            }
        } catch (error: any) {
            console.error('EnhancedLoginPage: Login error:', error);
            AuthErrorHandler.showError(error);
        } finally {
            setLoading(false);
        }
    };

    const handleBiometricLogin = async () => {
        try {
            setLoading(true);
            
            // Get stored credentials for biometric login
            const storedEmail = await AsyncStorage.getItem('biometric_email');
            if (!storedEmail) {
                AuthErrorHandler.showError({
                    message: 'No saved credentials found. Please log in with your password first.'
                });
                return;
            }

            const result = await BiometricAuth.authenticate('Sign in with biometrics');
            
            if (result.success) {
                // Get stored token or refresh session
                const token = await AsyncStorage.getItem('auth_token');
                if (token) {
                    // Verify token is still valid
                    const user = await authService.getCurrentUser();
                    if (user) {
                        navigateToUserDashboard(user);
                        return;
                    }
                }
                
                // Token invalid, need to re-authenticate
                AuthErrorHandler.showError({
                    message: 'Session expired. Please log in with your password.'
                });
            } else if (result.fallbackToPassword) {
                // User chose to use password or was locked out
                setEmail(storedEmail);
            } else if (result.error) {
                AuthErrorHandler.showError({
                    message: result.error
                });
            }
        } catch (error) {
            console.error('EnhancedLoginPage: Biometric login error:', error);
            AuthErrorHandler.showError(error);
        } finally {
            setLoading(false);
        }
    };

    const navigateToUserDashboard = async (user: any) => {
        // Store email for biometric login
        if (biometricEnabled) {
            await AsyncStorage.setItem('biometric_email', user.email);
        }

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
            router.replace('/');
        }
    };

    // Google Sign-In handlers
    const handleGoogleSignIn = () => {
        console.log('🔐 Opening Google Auth WebView');
        setShowGoogleAuth(true);
    };

    const handleGoogleAuthSuccess = async (user: any, token: string) => {
        console.log('🔐 Google Auth Success:', { user, token });
        setShowGoogleAuth(false);
        setLoading(true);
        
        try {
            if (user.token) {
                await AsyncStorage.setItem('auth_token', user.token);
                console.log('🔐 Token stored successfully');
            }
            
            navigateToUserDashboard(user);
        } catch (error) {
            console.error('🔐 Error after Google Auth success:', error);
            AuthErrorHandler.showError({
                message: 'Failed to complete login process. Please try again.'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleAuthError = (error: string) => {
        console.error('🔐 Google Auth Error:', error);
        setShowGoogleAuth(false);
        
        // Don't show alert for user cancellation
        if (AuthErrorHandler.shouldShowError && !AuthErrorHandler.shouldShowError(error)) {
            console.log('🔐 User cancelled Google sign-in, not showing error alert');
            return;
        }
        
        AuthErrorHandler.showError({ message: error });
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
                    {/* Biometric Login Button */}
                    {biometricEnabled && (
                        <TouchableOpacity
                            style={styles.biometricButton}
                            onPress={handleBiometricLogin}
                            disabled={loading}
                        >
                            <FontAwesome name="fingerprint" size={24} color="#4CAF50" />
                            <Text style={styles.biometricButtonText}>Sign in with biometrics</Text>
                        </TouchableOpacity>
                    )}

                    {biometricEnabled && (
                        <View style={styles.dividerContainer}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>or</Text>
                            <View style={styles.dividerLine} />
                        </View>
                    )}

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

                    {/* Google Sign-In Button */}
                    <View style={styles.dividerContainer}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>or</Text>
                        <View style={styles.dividerLine} />
                    </View>

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
    biometricButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        borderRadius: 25,
        paddingVertical: 15,
        paddingHorizontal: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#4CAF50',
        ...Platform.select({
            web: {
                width: INPUT_WIDTH_WEB,
            },
            default: {
                width: INPUT_WIDTH_MOBILE,
            }
        }),
    },
    biometricButtonText: {
        marginLeft: 12,
        fontSize: 16,
        color: '#4CAF50',
        fontWeight: '600',
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
        height: 50,
        fontSize: 16,
        color: '#333',
    },
    loginButton: {
        backgroundColor: '#4CAF50',
        borderRadius: 25,
        paddingVertical: 15,
        alignItems: 'center',
        marginBottom: 20,
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
        backgroundColor: '#A5D6A7',
    },
    loginButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20,
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
        fontSize: 14,
        color: '#666',
    },
    googleButton: {
        backgroundColor: '#FFFFFF',
        borderRadius: 25,
        paddingVertical: 15,
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E0E0E0',
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
    },
    googleIcon: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#4285F4',
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
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    linksContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    linkText: {
        fontSize: 14,
        color: '#4CAF50',
        textDecorationLine: 'underline',
    },
    signupContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    signupText: {
        fontSize: 14,
        color: '#666',
    },
    signupLink: {
        fontSize: 14,
        color: '#4CAF50',
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },
});

// Helper function to check if error should be shown
AuthErrorHandler.shouldShowError = (error: string): boolean => {
    const silentErrors = [
        'cancelled',
        'user_cancelled', 
        'access_denied',
        'SIGN_IN_CANCELLED',
        'No user data received from Google'
    ];

    return !silentErrors.some(silentError => 
        error.toLowerCase().includes(silentError.toLowerCase())
    );
};
