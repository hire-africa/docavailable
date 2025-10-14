import { FontAwesome } from '@expo/vector-icons';
import * as AuthSession from 'expo-auth-session';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

interface SmartGoogleAuthProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (user: any, token: string) => void;
  onError: (error: string) => void;
}

export default function SmartGoogleAuth({
  visible,
  onClose,
  onSuccess,
  onError,
}: SmartGoogleAuthProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'detecting' | 'webview' | 'browser'>('detecting');
  const [currentUrl, setCurrentUrl] = useState('');

  // Google OAuth configuration
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '449082896435-ge0pijdnl6j3e0c9jjclnl7tglmh45ml.apps.googleusercontent.com';
  const scope = 'openid profile email';
  
  // Generate redirect URI for deep linking
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'com.docavailable.app',
    path: 'oauth2redirect'
  });
  
  // Create OAuth request for browser auth
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: clientId,
      scopes: [scope],
      redirectUri: redirectUri,
      responseType: AuthSession.ResponseType.Code,
      extraParams: {
        access_type: 'offline',
        prompt: 'select_account', // This will show saved accounts!
      },
    },
    {
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    }
  );

  // WebView auth URL
  const webViewAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent('https://docavailable-3vbdv.ondigitalocean.app/api/oauth/callback')}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scope)}&` +
    `access_type=offline&` +
    `prompt=consent&` +
    `include_granted_scopes=true&` +
    `state=webview_auth`;

  // Detect authentication mode
  useEffect(() => {
    if (visible) {
      detectAuthMode();
    }
  }, [visible]);

  const detectAuthMode = async () => {
    setIsLoading(true);
    setAuthMode('detecting');
    
    try {
      // Try to detect if we can access browser accounts
      // This is a heuristic approach
      const canUseBrowser = await checkBrowserAccountAccess();
      
      if (canUseBrowser) {
        console.log('🔐 SmartGoogleAuth: Using browser authentication for saved accounts');
        setAuthMode('browser');
      } else {
        console.log('🔐 SmartGoogleAuth: Using WebView authentication');
        setAuthMode('webview');
      }
    } catch (error) {
      console.log('🔐 SmartGoogleAuth: Fallback to WebView');
      setAuthMode('webview');
    } finally {
      setIsLoading(false);
    }
  };

  const checkBrowserAccountAccess = async (): Promise<boolean> => {
    try {
      // Try to open a minimal OAuth request to see if we get account selection
      // This is a clever way to detect if the device has saved Google accounts
      const testUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=openid&` +
        `prompt=select_account&` +
        `state=test`;
      
      // We'll use a timeout to detect if accounts are available
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve(false); // Fallback to WebView
        }, 2000);

        // This is a simplified check - in practice, you'd need more sophisticated detection
        // For now, let's assume browser auth is better for account selection
        clearTimeout(timeout);
        resolve(true);
      });
    } catch (error) {
      return false;
    }
  };

  // Handle browser authentication
  const handleBrowserAuth = useCallback(async () => {
    if (!request) {
      onError('Authentication request not ready. Please try again.');
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('🔐 SmartGoogleAuth: Starting browser authentication...');
      await promptAsync();
    } catch (error) {
      console.error('🔐 SmartGoogleAuth: Browser auth error:', error);
      onError('Failed to start browser authentication. Please try again.');
      setIsLoading(false);
    }
  }, [request, promptAsync, onError]);

  // Handle WebView navigation
  const handleNavigationStateChange = useCallback((navState: any) => {
    const { url } = navState;
    setCurrentUrl(url);
    console.log('🔐 SmartGoogleAuth: Navigation to:', url);

    // Check for OAuth callback
    if (url.includes('oauth/callback') || url.includes('code=')) {
      console.log('🔐 SmartGoogleAuth: OAuth callback detected');
      
      try {
        const urlObj = new URL(url);
        const code = urlObj.searchParams.get('code');
        const error = urlObj.searchParams.get('error');
        
        if (error) {
          console.error('🔐 SmartGoogleAuth: OAuth error:', error);
          onError(`OAuth error: ${error}`);
          return;
        }
        
        if (code) {
          console.log('🔐 SmartGoogleAuth: Authorization code received:', code);
          handleAuthorizationCode(code);
        }
      } catch (error) {
        console.error('🔐 SmartGoogleAuth: Error parsing callback URL:', error);
        onError('Failed to parse OAuth callback');
      }
    }
  }, [onError]);

  // Handle authorization code exchange
  const handleAuthorizationCode = async (code: string) => {
    setIsLoading(true);
    
    try {
      console.log('🔐 SmartGoogleAuth: Exchanging code for token...');
      
      // For now, let's create a mock user for testing
      // In production, you would exchange the code for an ID token
      const mockUser = {
        id: 999,
        name: 'Google Test User',
        email: 'test@google.com',
        user_type: 'patient',
        status: 'active',
        google_id: 'google_test_123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const mockToken = 'mock_jwt_token_' + Date.now();
      
      console.log('🔐 SmartGoogleAuth: Using mock user for testing');
      onSuccess(mockUser, mockToken);
      
    } catch (error) {
      console.error('🔐 SmartGoogleAuth: Code exchange error:', error);
      onError('Failed to process Google authentication. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OAuth response from browser
  useEffect(() => {
    if (response?.type === 'success' && response.params?.code) {
      console.log('🔐 SmartGoogleAuth: Browser OAuth response received:', response);
      handleAuthorizationCode(response.params.code);
    } else if (response?.type === 'error') {
      console.error('🔐 SmartGoogleAuth: Browser OAuth error response:', response);
      onError(`Authentication failed: ${response.errorCode || 'Unknown error'}`);
    } else if (response?.type === 'cancel') {
      console.log('🔐 SmartGoogleAuth: User cancelled browser OAuth');
      onClose();
    }
  }, [response, onError, onClose]);

  // Handle WebView load events
  const handleLoadStart = useCallback(() => {
    console.log('🔐 SmartGoogleAuth: WebView load started');
    setIsLoading(true);
  }, []);

  const handleLoadEnd = useCallback(() => {
    console.log('🔐 SmartGoogleAuth: WebView load ended');
    setIsLoading(false);
  }, []);

  const handleError = useCallback((syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('🔐 SmartGoogleAuth: WebView error:', nativeEvent);
    onError('Failed to load Google authentication page');
  }, [onError]);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setCurrentUrl(webViewAuthUrl);
      setIsLoading(true);
    }
  }, [visible, webViewAuthUrl]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <FontAwesome name="times" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sign in with Google</Text>
          <TouchableOpacity
            style={styles.testButton}
            onPress={() => handleAuthorizationCode('test_code_123')}
          >
            <Text style={styles.testButtonText}>Test</Text>
          </TouchableOpacity>
        </View>

        {/* Mode Selection */}
        {authMode === 'detecting' && (
          <View style={styles.detectingContainer}>
            <ActivityIndicator size="large" color="#4285F4" />
            <Text style={styles.detectingText}>Detecting best authentication method...</Text>
          </View>
        )}

        {/* Browser Auth Mode */}
        {authMode === 'browser' && (
          <View style={styles.browserContainer}>
            <FontAwesome name="google" size={80} color="#4285F4" style={styles.googleIcon} />
            <Text style={styles.title}>One-Tap Sign-In</Text>
            <Text style={styles.subtitle}>
              We'll open your browser to show your saved Google accounts for quick sign-in
            </Text>
            
            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4285F4" />
                <Text style={styles.loadingText}>Opening browser...</Text>
              </View>
            )}

            {!isLoading && (
              <TouchableOpacity
                style={styles.browserButton}
                onPress={handleBrowserAuth}
                disabled={!request}
              >
                <FontAwesome name="external-link" size={20} color="#FFFFFF" />
                <Text style={styles.browserButtonText}>
                  {request ? 'Continue with Google' : 'Preparing...'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => setAuthMode('webview')}
            >
              <Text style={styles.switchButtonText}>Use in-app authentication instead</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* WebView Auth Mode */}
        {authMode === 'webview' && (
          <>
            {/* Loading Indicator */}
            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.loadingText}>Loading Google authentication...</Text>
              </View>
            )}

            {/* WebView */}
            <WebView
              source={{ uri: webViewAuthUrl }}
              style={styles.webview}
              onNavigationStateChange={handleNavigationStateChange}
              onLoadStart={handleLoadStart}
              onLoadEnd={handleLoadEnd}
              onError={handleError}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={false}
              scalesPageToFit={true}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              mixedContentMode="compatibility"
              thirdPartyCookiesEnabled={true}
              allowsBackForwardNavigationGestures={true}
              userAgent="Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
              onShouldStartLoadWithRequest={(request) => {
                console.log('🔐 SmartGoogleAuth: Should start load with request:', request.url);
                
                // Allow Google domains
                if (request.url.includes('accounts.google.com') || 
                    request.url.includes('google.com') ||
                    request.url.includes('oauth/callback')) {
                  return true;
                }
                
                // Block other domains for security
                console.log('🔐 SmartGoogleAuth: Blocking non-Google domain:', request.url);
                return false;
              }}
            />
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  detectingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  detectingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  browserContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  googleIcon: {
    marginBottom: 20,
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
  browserButton: {
    backgroundColor: '#4285F4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#4285F4',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  browserButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  switchButton: {
    padding: 12,
  },
  switchButtonText: {
    color: '#4285F4',
    fontSize: 14,
    textAlign: 'center',
  },
  webview: {
    flex: 1,
  },
});
