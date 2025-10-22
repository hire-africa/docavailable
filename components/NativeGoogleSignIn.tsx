import { FontAwesome } from '@expo/vector-icons';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface NativeGoogleSignInProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (user: any, token: string) => void;
  onError: (error: string) => void;
  userType?: 'patient' | 'doctor' | 'admin';
}

export default function NativeGoogleSignIn({
  visible,
  onClose,
  onSuccess,
  onError,
  userType = 'patient',
}: NativeGoogleSignInProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));

  // Configure Google Sign-In
  useEffect(() => {
    const configureGoogleSignIn = async () => {
      try {
        console.log('🔐 NativeGoogleSignIn: Configuring Google Sign-In...');
        
        // Check if GoogleSignin is available
        if (!GoogleSignin || typeof GoogleSignin.configure !== 'function') {
          throw new Error('GoogleSignin is not available. Make sure you have a development build.');
        }
        
        // Configure Google Sign-In
        await GoogleSignin.configure({
          webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '449082896435-ge0pijdnl6j3e0c9jjclnl7tglmh45ml.apps.googleusercontent.com',
          offlineAccess: true,
          hostedDomain: '',
          forceCodeForRefreshToken: true,
        });

        // Check if user is already signed in
        if (GoogleSignin.isSignedIn && typeof GoogleSignin.isSignedIn === 'function') {
          const isSignedIn = await GoogleSignin.isSignedIn();
          if (isSignedIn) {
            console.log('🔐 NativeGoogleSignIn: User already signed in');
            const userInfo = await GoogleSignin.getCurrentUser();
            if (userInfo) {
              onSuccess(userInfo.user, userInfo.idToken || '');
              return;
            }
          }
        }

        setIsConfigured(true);
        console.log('🔐 NativeGoogleSignIn: Google Sign-In configured successfully');
      } catch (error) {
        console.error('🔐 NativeGoogleSignIn: Configuration error:', error);
        onError('Failed to configure Google Sign-In. Please rebuild your development client.');
      }
    };

    configureGoogleSignIn();
  }, [onSuccess, onError]);

  // Auto-trigger Google Sign-In when modal opens and is configured
  useEffect(() => {
    if (visible && isConfigured && !isLoading) {
      console.log('🔐 NativeGoogleSignIn: Auto-triggering Google Sign-In...');
      // Trigger immediately when configured
      handleGoogleSignIn();
    }
  }, [visible, isConfigured, isLoading, handleGoogleSignIn]);

  // Animate modal appearance
  useEffect(() => {
    if (visible) {
      // Set loading state immediately when modal opens
      setIsLoading(true);
      
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [visible, fadeAnim, scaleAnim]);

  // Handle Google Sign-In
  const handleGoogleSignIn = useCallback(async () => {
    if (!isConfigured) {
      onError('Google Sign-In not configured yet. Please wait...');
      return;
    }

    // Check if GoogleSignin methods are available
    if (!GoogleSignin || typeof GoogleSignin.signIn !== 'function') {
      onError('Google Sign-In not available. Please rebuild your development client.');
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('🔐 NativeGoogleSignIn: Starting Google Sign-In...');
      
      // Check if device supports Google Play Services
      if (GoogleSignin.hasPlayServices && typeof GoogleSignin.hasPlayServices === 'function') {
        await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true,
        });
      }

      // Sign in with Google - THIS SHOWS THE NATIVE MODAL WITH SAVED ACCOUNTS!
      const userInfo = await GoogleSignin.signIn();
      
      console.log('🔐 NativeGoogleSignIn: Sign-in successful:', userInfo);
      
      // Check if user data exists in the response
      const userData = userInfo.data?.user || userInfo.user;
      const idToken = userInfo.data?.idToken || userInfo.idToken;
      
      if (userData && idToken) {
        // Transform user data to match your app's format
        const googleUserData = {
          id: userData.id,
          name: userData.name || '',
          email: userData.email,
          user_type: userType, // Use the userType prop
          status: 'active',
          google_id: userData.id,
          profile_picture: userData.photo || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('🔐 NativeGoogleSignIn: Google user data:', googleUserData);
        
        // Check if user exists in database
        await checkUserExistsAndHandle(googleUserData, idToken);
      } else {
        console.log('🔐 NativeGoogleSignIn: Available data structure:', JSON.stringify(userInfo, null, 2));
        throw new Error('No user data received from Google');
      }
      
    } catch (error: any) {
      console.error('🔐 NativeGoogleSignIn: Sign-in error:', error);
      
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('🔐 NativeGoogleSignIn: User cancelled sign-in');
        onClose();
      } else if (error.code === statusCodes.IN_PROGRESS) {
        console.log('🔐 NativeGoogleSignIn: Sign-in already in progress');
        onError('Sign-in already in progress. Please wait...');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        onError('Google Play Services not available. Please update your device.');
      } else {
        // Check if this is a cancellation error
        if (error.message && error.message.includes('cancelled')) {
          console.log('🔐 NativeGoogleSignIn: User cancelled sign-in (detected from message)');
          onClose();
        } else {
          onError(`Sign-in failed: ${error.message || 'Unknown error'}`);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [isConfigured, onSuccess, onError, onClose]);

  // Authenticate user with Google OAuth using backend endpoint
  const checkUserExistsAndHandle = async (googleUserData: any, idToken: string) => {
    try {
      console.log('🔐 NativeGoogleSignIn: Attempting to authenticate with Google OAuth...');
      console.log('🔐 NativeGoogleSignIn: Google user data:', googleUserData);
      console.log('🔐 NativeGoogleSignIn: Google ID token:', idToken);
      
      // Test if API is working first
      console.log('🔐 NativeGoogleSignIn: Testing API connectivity...');
      try {
        const testResponse = await fetch('https://docavailable-3vbdv.ondigitalocean.app/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'test'
          })
        });
        console.log('🔐 NativeGoogleSignIn: Test API response status:', testResponse.status);
        const testText = await testResponse.text();
        console.log('🔐 NativeGoogleSignIn: Test API response:', testText.substring(0, 200));
      } catch (testError) {
        console.error('🔐 NativeGoogleSignIn: Test API error:', testError);
      }

      // Use the backend's Google OAuth endpoint
      const googleLoginResponse = await fetch('https://docavailable-3vbdv.ondigitalocean.app/api/auth/google-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id_token: idToken,
          user_type: userType // Pass the chosen user type
        })
      });

      console.log('🔐 NativeGoogleSignIn: Google login response status:', googleLoginResponse.status);
      console.log('🔐 NativeGoogleSignIn: Google login response headers:', googleLoginResponse.headers);
      
      // Check if response is JSON
      const contentType = googleLoginResponse.headers.get('content-type');
      console.log('🔐 NativeGoogleSignIn: Response content type:', contentType);
      
      let googleLoginData;
      try {
        const responseText = await googleLoginResponse.text();
        console.log('🔐 NativeGoogleSignIn: Raw response text:', responseText);
        
        if (contentType && contentType.includes('application/json')) {
          googleLoginData = JSON.parse(responseText);
        } else {
          throw new Error(`Expected JSON response but got: ${contentType}. Response: ${responseText.substring(0, 200)}...`);
        }
      } catch (parseError) {
        console.error('🔐 NativeGoogleSignIn: JSON parse error:', parseError);
        onError('Server returned invalid response. Please try again.');
        return;
      }
      
      console.log('🔐 NativeGoogleSignIn: Google login response data:', googleLoginData);

      if (googleLoginResponse.ok && googleLoginData.success && googleLoginData.data && googleLoginData.data.user) {
        // Success! We have a proper JWT token from the backend
        const userWithToken = {
          ...googleLoginData.data.user,
          token: googleLoginData.data.token
        };
        
        console.log('🔐 NativeGoogleSignIn: Successfully authenticated with Google OAuth and received JWT token:', userWithToken);
        onSuccess(userWithToken, googleLoginData.data.token);
        return;
      } else {
        // Handle different error cases
        if (googleLoginResponse.status === 401) {
          console.log('🔐 NativeGoogleSignIn: Invalid Google token');
          onError('Invalid Google authentication. Please try signing in again.');
          return;
        } else if (googleLoginResponse.status === 404) {
          console.log('🔐 NativeGoogleSignIn: No account found with this email');
          onError('No account found with this email. Please create an account first or use a different email.');
          return;
        } else if (googleLoginResponse.status === 500) {
          console.log('🔐 NativeGoogleSignIn: Server error');
          onError('Server error occurred. Please try again later.');
          return;
        } else if (googleLoginResponse.status === 0) {
          console.log('🔐 NativeGoogleSignIn: Network error');
          onError('Network error. Please check your internet connection and try again.');
          return;
        } else {
          console.log('🔐 NativeGoogleSignIn: Google authentication failed:', googleLoginData?.message || 'Unknown error');
          onError(googleLoginData?.message || `Authentication failed (${googleLoginResponse.status}). Please try again.`);
          return;
        }
      }
      
    } catch (error) {
      console.error('🔐 NativeGoogleSignIn: Error during Google authentication:', error);
      onError('Authentication failed. Please check your internet connection and try again.');
    }
  };

  // Google OAuth now only logs in existing users - no signup functionality

  // Handle sign out (for testing)
  const handleSignOut = useCallback(async () => {
    try {
      await GoogleSignin.signOut();
      console.log('🔐 NativeGoogleSignIn: User signed out');
    } catch (error) {
      console.error('🔐 NativeGoogleSignIn: Sign-out error:', error);
    }
  }, []);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
      transparent={true}
    >
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.modalContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
              >
                <FontAwesome name="times" size={20} color="#666" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Sign in with Google</Text>
              <TouchableOpacity
                style={styles.testButton}
                onPress={handleSignOut}
              >
                <Text style={styles.testButtonText}>Sign Out</Text>
              </TouchableOpacity>
            </View>

            {/* Main Content */}
            <View style={styles.mainContent}>
              {/* Loading State - Show while configuring or signing in */}
              {(isLoading || !isConfigured) && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#4285F4" />
                  <Text style={styles.loadingText}>
                    {!isConfigured ? 'Preparing Google Sign-In...' : 'Opening Google Sign-In...'}
                  </Text>
                  <Text style={styles.loadingSubtext}>
                    {!isConfigured ? 'Please wait a moment' : 'This will show your saved accounts'}
                  </Text>
                </View>
              )}

              {/* Fallback UI - Only show if there's an error or user cancels */}
              {!isLoading && isConfigured && (
                <>
                  {/* Google Logo Animation */}
                  <Animated.View 
                    style={[
                      styles.logoContainer,
                      {
                        transform: [{
                          scale: fadeAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.8, 1],
                          })
                        }]
                      }
                    ]}
                  >
                    <FontAwesome name="google" size={60} color="#4285F4" />
                  </Animated.View>

                  {/* Title */}
                  <Text style={styles.title}>Sign in to DocAvailable</Text>
                  <Text style={styles.subtitle}>
                    Tap the button below to sign in with your existing Google account
                  </Text>

                  {/* Sign In Button */}
                  <TouchableOpacity
                    style={styles.signInButton}
                    onPress={handleGoogleSignIn}
                  >
                    <FontAwesome name="google" size={20} color="#FFFFFF" />
                    <Text style={styles.signInButtonText}>Sign in with Google</Text>
                  </TouchableOpacity>

                  {/* Features List */}
                  <View style={styles.featuresContainer}>
                    <View style={styles.featureItem}>
                      <FontAwesome name="shield" size={16} color="#4CAF50" />
                      <Text style={styles.featureText}>Secure & Private</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <FontAwesome name="bolt" size={16} color="#4CAF50" />
                      <Text style={styles.featureText}>One-Tap Sign-In</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <FontAwesome name="mobile" size={16} color="#4CAF50" />
                      <Text style={styles.featureText}>Native Experience</Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  container: {
    flex: 1,
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
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  testButton: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  mainContent: {
    flex: 1,
    padding: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 30,
    padding: 20,
    backgroundColor: '#F8F9FA',
    borderRadius: 50,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  loadingContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  signInButton: {
    backgroundColor: '#4285F4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 40,
    shadowColor: '#4285F4',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    backgroundColor: '#CCCCCC',
    shadowOpacity: 0,
    elevation: 0,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 30,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  featureText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  debugInfo: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontFamily: 'monospace',
  },
});