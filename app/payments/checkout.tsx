import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, NativeModules, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

export default function PayChanguCheckout() {
  const params = useLocalSearchParams();
  
  // Get parameters from route params (works with both object and URL formats)
  const checkoutUrl = (params.url as string) || '';
  const txRef = (params.tx_ref as string) || '';
  const [isLoading, setIsLoading] = useState(true);
  const [webViewError, setWebViewError] = useState<string | null>(null);
  const [loadingTimeout, setLoadingTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  console.log('🎯 PayChanguCheckout component rendered');
  console.log('🎯 Received params:', params);
  console.log('🎯 Checkout URL:', checkoutUrl);
  console.log('🎯 Transaction Ref:', txRef);
  console.log('🎯 Screen location: app/payments/checkout.tsx');
  console.log('🎯 WebView import test:', typeof WebView);
  
  // Test RNCWebView module linking
  console.log('🧪 Testing RNCWebView module linking...');
  try {
    const webViewModule = NativeModules.RNCWebView;
    console.log('✅ RNCWebView module found:', webViewModule);
    if (webViewModule) {
      console.log('✅ WebView module is properly linked!');
      console.log('📋 Available methods:', Object.keys(webViewModule));
    } else {
      console.log('❌ RNCWebView module is null/undefined');
    }
  } catch (error) {
    console.log('❌ Error accessing RNCWebView module:', error.message);
  }

  // WebView event handlers
  const handleWebViewLoadStart = useCallback(() => {
    console.log('🔄 WebView loading started');
    setIsLoading(true);
    setWebViewError(null);
    
    // Set a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.log('⏰ WebView loading timeout');
      setWebViewError('Payment page is taking too long to load. Please try again.');
      setIsLoading(false);
    }, 30000); // 30 seconds timeout
    
    setLoadingTimeout(timeout);
  }, []);

  const handleWebViewLoadEnd = useCallback(() => {
    console.log('✅ WebView loading completed');
    setIsLoading(false);
    
    // Clear the timeout since loading completed
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
      setLoadingTimeout(null);
    }
  }, [loadingTimeout]);

  const handleWebViewError = useCallback((syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('❌ WebView error:', nativeEvent);
    
    let errorMessage = 'Failed to load payment page';
    
    if (nativeEvent.description) {
      if (nativeEvent.description.includes('net::ERR_INTERNET_DISCONNECTED')) {
        errorMessage = 'No internet connection. Please check your network and try again.';
      } else if (nativeEvent.description.includes('net::ERR_CONNECTION_TIMED_OUT')) {
        errorMessage = 'Connection timed out. Please try again.';
      } else if (nativeEvent.description.includes('net::ERR_NAME_NOT_RESOLVED')) {
        errorMessage = 'Unable to reach payment server. Please try again later.';
      } else {
        errorMessage = `Failed to load payment page: ${nativeEvent.description}`;
      }
    }
    
    setWebViewError(errorMessage);
    setIsLoading(false);
    
    // Clear the timeout since we have an error
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
      setLoadingTimeout(null);
    }
  }, [loadingTimeout]);

  const handleWebViewNavigationStateChange = useCallback((navState: any) => {
    console.log('🔄 Navigation state changed:', {
      url: navState.url,
      canGoBack: navState.canGoBack,
      loading: navState.loading
    });
  }, []);

  useEffect(() => {
    console.log('🔍 Checkout Debug:', {
      checkoutUrl,
      txRef,
      hasUrl: !!checkoutUrl,
      hasTxRef: !!txRef
    });
  }, [checkoutUrl, txRef]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
    };
  }, [loadingTimeout]);

  const checkPaymentStatus = useCallback(async () => {
    if (!txRef) return;
    
    try {
      console.log('🔄 Checking payment status for:', txRef);
      
      // Import payment service to check status
      const { paymentService } = await import('../../services/paymentService');
      const statusResult = await paymentService.checkPaymentStatus(txRef);
      
      if (statusResult.success) {
        if (statusResult.status === 'success') {
          Alert.alert(
            'Payment Successful!',
            'Your payment has been completed and your subscription is now active.',
            [
              { text: 'OK', onPress: () => router.back() }
            ]
          );
        } else if (statusResult.status === 'pending') {
          Alert.alert(
            'Payment Pending',
            'Your payment is being processed. Please wait a moment and check again.',
            [
              { text: 'Check Again', onPress: () => checkPaymentStatus() },
              { text: 'OK', onPress: () => router.back() }
            ]
          );
        } else {
          Alert.alert(
            'Payment Status',
            `Your payment status: ${statusResult.status}. Please contact support if you have any questions.`,
            [
              { text: 'OK', onPress: () => router.back() }
            ]
          );
        }
      } else {
        Alert.alert(
          'Payment Status',
          'Unable to check payment status. Please check your payment status in the app. If payment was successful, your subscription will be updated shortly.',
          [
            { text: 'OK', onPress: () => router.back() }
          ]
        );
      }
    } catch (error) {
      console.error('❌ Error checking payment status:', error);
      Alert.alert(
        'Payment Status',
        'Unable to check payment status. Please check your payment status in the app.',
        [
          { text: 'OK', onPress: () => router.back() }
        ]
      );
    }
  }, [txRef]);

  if (!checkoutUrl) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, marginBottom: 20, textAlign: 'center' }}>
          Payment URL not available
        </Text>
        <Text style={{ fontSize: 14, marginBottom: 20, textAlign: 'center', color: '#666' }}>
          Debug Info: {JSON.stringify(params)}
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: '#007AFF',
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 8,
            marginBottom: 10,
          }}
          onPress={() => {
            // Test with a sample URL
            const testUrl = 'https://www.google.com';
            console.log('🧪 Testing with sample URL:', testUrl);
            router.push(`/payments/checkout?url=${encodeURIComponent(testUrl)}&tx_ref=test123`);
          }}
        >
          <Text style={{ color: 'white', fontSize: 16 }}>Test with Sample URL</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            backgroundColor: '#8E8E93',
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 8,
          }}
          onPress={() => router.back()}
        >
          <Text style={{ color: 'white', fontSize: 16 }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (webViewError) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, marginBottom: 20, textAlign: 'center', color: '#FF3B30' }}>
          Payment Error
        </Text>
        <Text style={{ fontSize: 14, marginBottom: 30, textAlign: 'center', color: '#666' }}>
          {webViewError}
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: '#007AFF',
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 8,
            marginBottom: 10,
          }}
          onPress={() => {
            setWebViewError(null);
            setIsLoading(true);
          }}
        >
          <Text style={{ color: 'white', fontSize: 16 }}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            backgroundColor: '#8E8E93',
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 8,
          }}
          onPress={() => router.back()}
        >
          <Text style={{ color: 'white', fontSize: 16 }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
      }}>
        <TouchableOpacity
          style={{ padding: 8, marginRight: 8 }}
          onPress={() => router.back()}
        >
          <Text style={{ fontSize: 16, color: '#007AFF' }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 16, fontWeight: 'bold', textAlign: 'center' }}>
          PayChangu Payment
        </Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Loading Overlay */}
      {isLoading && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>
            Loading payment page...
          </Text>
        </View>
      )}

      {/* WebView */}
      <WebView
        source={{ uri: checkoutUrl }}
        style={{ flex: 1 }}
        onLoadStart={handleWebViewLoadStart}
        onLoadEnd={handleWebViewLoadEnd}
        onError={handleWebViewError}
        onNavigationStateChange={handleWebViewNavigationStateChange}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        mixedContentMode="compatibility"
        userAgent="Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36"
        onShouldStartLoadWithRequest={(request) => {
          console.log('🔄 WebView navigation request:', request.url);
          
          // Allow Paychangu domains
          if (request.url.includes('paychangu.com') || request.url.includes('checkout.paychangu.com')) {
            return true;
          }
          
          // Handle payment completion redirects
          if (request.url.includes('success') || request.url.includes('completed')) {
            Alert.alert(
              'Payment Successful!',
              'Your payment has been completed successfully.',
              [
                { text: 'OK', onPress: () => {
                  checkPaymentStatus();
                  router.back();
                }}
              ]
            );
            return false;
          }
          
          if (request.url.includes('cancel') || request.url.includes('failed')) {
            Alert.alert(
              'Payment Cancelled',
              'Your payment was cancelled. Please try again.',
              [
                { text: 'OK', onPress: () => router.back() }
              ]
            );
            return false;
          }
          
          return true;
        }}
      />
    </SafeAreaView>
  );
}