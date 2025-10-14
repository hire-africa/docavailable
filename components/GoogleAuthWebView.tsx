import { FontAwesome } from '@expo/vector-icons';
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
import authService from '../services/authService';

interface GoogleAuthWebViewProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (user: any, token: string) => void;
  onError: (error: string) => void;
}

export default function GoogleAuthWebView({
  visible,
  onClose,
  onSuccess,
  onError,
}: GoogleAuthWebViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState('');

  // Google OAuth configuration
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '449082896435-ge0pijdnl6j3e0c9jjclnl7tglmh45ml.apps.googleusercontent.com';
  const scope = 'openid profile email';
  
  // Use a simple redirect URI that's more likely to work
  const redirectUri = 'https://docavailable-3vbdv.ondigitalocean.app/api/oauth/callback';
  
  const authUrl = `https://accounts.google.com/oauth/authorize?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scope)}&` +
    `access_type=offline&` +
    `prompt=select_account&` +
    `state=webview_auth`;

  console.log('🔐 GoogleAuthWebView: Opening OAuth URL:', authUrl);

  // Handle WebView navigation
  const handleNavigationStateChange = useCallback((navState: any) => {
    const { url } = navState;
    setCurrentUrl(url);
    console.log('🔐 GoogleAuthWebView: Navigation to:', url);

    // Check for OAuth callback
    if (url.includes('oauth/callback') || url.includes('code=')) {
      console.log('🔐 GoogleAuthWebView: OAuth callback detected');
      
      try {
        const urlObj = new URL(url);
        const code = urlObj.searchParams.get('code');
        const error = urlObj.searchParams.get('error');
        
        if (error) {
          console.error('🔐 GoogleAuthWebView: OAuth error:', error);
          onError(`OAuth error: ${error}`);
          return;
        }
        
        if (code) {
          console.log('🔐 GoogleAuthWebView: Authorization code received:', code);
          handleAuthorizationCode(code);
        }
      } catch (error) {
        console.error('🔐 GoogleAuthWebView: Error parsing callback URL:', error);
        onError('Failed to parse OAuth callback');
      }
    }
  }, [onError]);

  // Handle messages from WebView
  const handleMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('🔐 GoogleAuthWebView: Received message:', data);
      
      if (data.type === 'oauth_callback' && data.code) {
        console.log('🔐 GoogleAuthWebView: OAuth callback via postMessage:', data.code);
        handleAuthorizationCode(data.code);
      }
    } catch (error) {
      console.error('🔐 GoogleAuthWebView: Error parsing WebView message:', error);
    }
  }, []);

  // Handle authorization code exchange
  const handleAuthorizationCode = async (code: string) => {
    setIsLoading(true);
    
    try {
      console.log('🔐 GoogleAuthWebView: Exchanging code for token...');
      
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
      
      console.log('🔐 GoogleAuthWebView: Using mock user for testing');
      onSuccess(mockUser, mockToken);
      
    } catch (error) {
      console.error('🔐 GoogleAuthWebView: Code exchange error:', error);
      onError('Failed to process Google authentication. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle WebView load events
  const handleLoadStart = useCallback(() => {
    console.log('🔐 GoogleAuthWebView: Load started');
    setIsLoading(true);
  }, []);

  const handleLoadEnd = useCallback(() => {
    console.log('🔐 GoogleAuthWebView: Load ended');
    setIsLoading(false);
  }, []);

  const handleError = useCallback((syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('🔐 GoogleAuthWebView: WebView error:', nativeEvent);
    onError('Failed to load Google authentication page');
  }, [onError]);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setCurrentUrl(authUrl);
      setIsLoading(true);
    }
  }, [visible, authUrl]);

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

        {/* Loading Indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Loading Google authentication...</Text>
          </View>
        )}

        {/* WebView */}
        <WebView
          source={{ uri: authUrl }}
          style={styles.webview}
          onNavigationStateChange={handleNavigationStateChange}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          onError={handleError}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={false}
          scalesPageToFit={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          mixedContentMode="compatibility"
          thirdPartyCookiesEnabled={true}
          allowsBackForwardNavigationGestures={true}
          userAgent="Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36"
          onShouldStartLoadWithRequest={(request) => {
            console.log('🔐 GoogleAuthWebView: Should start load with request:', request.url);
            
            // Allow Google domains
            if (request.url.includes('accounts.google.com') || 
                request.url.includes('google.com') ||
                request.url.includes('oauth/callback')) {
              return true;
            }
            
            // Block other domains for security
            console.log('🔐 GoogleAuthWebView: Blocking non-Google domain:', request.url);
            return false;
          }}
        />
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
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  webview: {
    flex: 1,
  },
});
