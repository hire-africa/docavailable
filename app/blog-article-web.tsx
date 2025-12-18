import { router, useLocalSearchParams } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import Icon from '../components/Icon';

export default function BlogArticleWeb() {
  const params = useLocalSearchParams();
  const articleUrl = (params.url as string) || '';
  const articleTitle = (params.title as string) || 'Article';
  const [isLoading, setIsLoading] = useState(true);
  const [webViewError, setWebViewError] = useState<string | null>(null);
  const webViewRef = useRef<WebView>(null);

  if (!articleUrl) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <StatusBar hidden={true} />
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
          >
            <Icon name="arrowLeft" size={16} color="#222" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Article</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No article URL provided</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleWebViewLoadStart = () => {
    setIsLoading(true);
    setWebViewError(null);
  };

  const handleWebViewLoadEnd = () => {
    setIsLoading(false);
  };

  const handleWebViewError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView error:', nativeEvent);
    setWebViewError('Failed to load article. Please check your internet connection and try again.');
    setIsLoading(false);
  };

  const handleShouldStartLoadWithRequest = (request: any) => {
    // Allow navigation within the same domain
    const requestUrl = request.url;
    const articleDomain = new URL(articleUrl).hostname;
    
    try {
      const requestDomain = new URL(requestUrl).hostname;
      // Allow same domain navigation, block external links
      if (requestDomain === articleDomain || requestUrl === articleUrl) {
        return true;
      }
    } catch (e) {
      // If URL parsing fails, allow it (might be a relative URL)
      return true;
    }
    
    // For external links, open in external browser (optional - you can change this behavior)
    // For now, we'll block external navigation to keep user in app
    return false;
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar hidden={true} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Icon name="arrowLeft" size={16} color="#222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {articleTitle}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Loading Indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading article...</Text>
        </View>
      )}

      {/* Error State */}
      {webViewError && (
        <View style={styles.errorContainer}>
          <Icon name="warning" size={48} color="#FF6B6B" />
          <Text style={styles.errorText}>{webViewError}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setWebViewError(null);
              setIsLoading(true);
              webViewRef.current?.reload();
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* WebView */}
      {!webViewError && (
        <WebView
          ref={webViewRef}
          source={{ uri: articleUrl }}
          style={styles.webview}
          onLoadStart={handleWebViewLoadStart}
          onLoadEnd={handleWebViewLoadEnd}
          onError={handleWebViewError}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView HTTP error:', nativeEvent);
            if (nativeEvent.statusCode >= 400) {
              setWebViewError(`Failed to load article (Error ${nativeEvent.statusCode}). Please try again later.`);
              setIsLoading(false);
            }
          }}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4CAF50" />
              <Text style={styles.loadingText}>Loading article...</Text>
            </View>
          )}
          // Allow JavaScript for better article rendering
          javaScriptEnabled={true}
          // Allow DOM storage for better compatibility
          domStorageEnabled={true}
          // Allow third-party cookies (some articles may need this)
          thirdPartyCookiesEnabled={true}
          // Allow mixed content (some articles load resources over HTTP)
          mixedContentMode="always"
          // User agent to help with compatibility
          userAgent="Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36"
        />
      )}
    </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8F5E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F8FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8F5E8',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginHorizontal: 12,
    textAlign: 'center',
  },
  placeholder: {
    width: 44,
  },
  webview: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

