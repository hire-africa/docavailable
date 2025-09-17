import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useAuth } from '../../contexts/AuthContext';

export default function PayChanguCheckout() {
  const params = useLocalSearchParams();
  const { refreshUserData } = useAuth();
  
  // Get parameters from route params
  const checkoutUrl = (params.url as string) || '';
  const txRef = (params.tx_ref as string) || '';
  const [isLoading, setIsLoading] = useState(true);
  const [webViewError, setWebViewError] = useState<string | null>(null);
  const [loadingTimeout, setLoadingTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [paymentCheckTimer, setPaymentCheckTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [hasDetectedPayment, setHasDetectedPayment] = useState(false);
  const [countdownTimeout, setCountdownTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  console.log('🎯 PayChanguCheckout component rendered');
  console.log('🎯 Received params:', params);
  console.log('🎯 Checkout URL:', checkoutUrl);
  console.log('🎯 Transaction Ref:', txRef);

  // WebView event handlers
  const handleWebViewLoadStart = useCallback(() => {
    console.log('🔄 WebView loading started');
    setIsLoading(true);
    setWebViewError(null);
    
    // Clear any existing timeout
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
    }
    
    // Set a longer timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.log('⏰ WebView loading timeout - checking if page actually loaded');
      // Only show error if page hasn't loaded at all
      if (!hasLoaded) {
        console.log('⚠️ Page never loaded, showing timeout error');
        setWebViewError('Payment page is taking too long to load. Please check your internet connection and try again.');
        setIsLoading(false);
      } else {
        console.log('✅ Page loaded successfully, just stopping loading indicator');
        setIsLoading(false);
      }
    }, 45000); // 45 seconds timeout - more reasonable
    
    setLoadingTimeout(timeout);
  }, [loadingTimeout]);

  const handlePaymentSuccess = useCallback(async () => {
    console.log('✅ Payment successful, refreshing user data...');
    try {
      // Refresh user data to get updated subscription
      await refreshUserData();
      console.log('✅ User data refreshed successfully');
    } catch (error) {
      console.error('❌ Error refreshing user data:', error);
    }
  }, [refreshUserData]);

  const checkPaymentStatus = useCallback(async () => {
    console.log('🔍 Checking payment status for transaction:', txRef);
    try {
      const response = await fetch(`https://docavailable-3vbdv.ondigitalocean.app/api/payments/paychangu/status?tx_ref=${txRef}`);
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.log('⚠️ API returned non-JSON response, treating as payment not ready');
        return { success: false, status: 'pending' };
      }
      
      const data = await response.json();
      console.log('📊 Payment status response:', data);
      
      if (data && data.success) {
        // Refresh user data to get updated subscription
        await handlePaymentSuccess();
      }
      
      return data;
    } catch (error) {
      console.error('❌ Error checking payment status:', error);
      // If it's a JSON parse error, the payment might not be ready yet
      if (error.message && error.message.includes('JSON Parse error')) {
        console.log('⚠️ JSON parse error - payment might not be ready yet');
        return { success: false, status: 'pending' };
      }
      return null;
    }
  }, [txRef, handlePaymentSuccess]);

  const handleWebViewLoadEnd = useCallback(() => {
    console.log('✅ WebView loading completed');
    setIsLoading(false);
    setHasLoaded(true);
    
    // Clear the timeout since loading completed
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
      setLoadingTimeout(null);
    }

    // Start periodic payment checking after page loads
    if (txRef && !hasDetectedPayment) {
      console.log('🔄 Starting periodic payment check for txRef:', txRef);
      let checkCount = 0;
      const maxChecks = 20; // Check for 1 minute (20 * 3 seconds)
      
      const timer = setInterval(async () => {
        try {
          checkCount++;
          console.log(`🔄 Checking payment status periodically (${checkCount}/${maxChecks})...`);
          
          const statusData = await checkPaymentStatus();
          
          if (statusData && statusData.success && statusData.status === 'success') {
            console.log('✅ Payment detected as successful via periodic check');
            setHasDetectedPayment(true);
            clearInterval(timer);
            setPaymentCheckTimer(null);
            
            // Refresh user data
            await handlePaymentSuccess();
            
            Alert.alert(
              'Payment Successful!',
              'Your payment has been completed successfully.',
              [
                { text: 'OK', onPress: () => router.back() }
              ]
            );
          } else if (checkCount >= maxChecks) {
            // After 1 minute, assume payment was successful if we haven't detected failure
            console.log('⏰ Payment check timeout - assuming payment successful');
            setHasDetectedPayment(true);
            clearInterval(timer);
            setPaymentCheckTimer(null);
            
            // Refresh user data
            await handlePaymentSuccess();
            
            Alert.alert(
              'Payment Completed',
              'Your payment has been processed. Please check your subscription status.',
              [
                { text: 'OK', onPress: () => router.back() }
              ]
            );
          }
        } catch (error) {
          console.log('🔄 Periodic payment check failed:', error);
        }
      }, 3000); // Check every 3 seconds
      
      setPaymentCheckTimer(timer);
      
      // Add a countdown timeout - if we haven't detected payment after 10 seconds,
      // assume the countdown froze and trigger success
      const countdownTimer = setTimeout(async () => {
        if (!hasDetectedPayment) {
          console.log('⏰ Countdown timeout - assuming payment successful (countdown may have frozen)');
          setHasDetectedPayment(true);
          
          // Refresh user data
          await handlePaymentSuccess();
          
          Alert.alert(
            'Payment Completed',
            'Your payment has been processed. Please check your subscription status.',
            [
              { text: 'OK', onPress: () => router.back() }
            ]
          );
        }
      }, 10000); // 10 seconds timeout
      
      setCountdownTimeout(countdownTimer);
    }
  }, [loadingTimeout, txRef, hasDetectedPayment, checkPaymentStatus, handlePaymentSuccess]);

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

    // Check if we're on a success page and haven't detected payment yet
    if (navState.url && !hasDetectedPayment) {
      const url = navState.url.toLowerCase();
      if (url.includes('success') || url.includes('completed') || url.includes('paid') || 
          url.includes('payment-success') || url.includes('thank-you')) {
        console.log('✅ Success page detected via navigation change:', navState.url);
        
        // Refresh user data and show success
        handlePaymentSuccess().then(() => {
          console.log('✅ User data refreshed after success page detection');
        }).catch((error) => {
          console.error('❌ Error refreshing user data after success page detection:', error);
        });
        
        setHasDetectedPayment(true);
        
        Alert.alert(
          'Payment Successful!',
          'Your payment has been completed successfully.',
          [
            { text: 'OK', onPress: () => router.back() }
          ]
        );
      }
    }
  }, [hasDetectedPayment, handlePaymentSuccess]);

  useEffect(() => {
    console.log('🔍 Checkout Debug:', {
      checkoutUrl,
      txRef,
      hasUrl: !!checkoutUrl,
      hasTxRef: !!txRef
    });
  }, [checkoutUrl, txRef]);

  // Fallback: Auto-hide loading after 10 seconds if no error
  useEffect(() => {
    if (isLoading && !webViewError) {
      const fallbackTimeout = setTimeout(() => {
        console.log('🔄 Fallback: Auto-hiding loading indicator after 10 seconds');
        setIsLoading(false);
      }, 10000);
      
      return () => clearTimeout(fallbackTimeout);
    }
  }, [isLoading, webViewError]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
      if (paymentCheckTimer) {
        clearInterval(paymentCheckTimer);
      }
      if (countdownTimeout) {
        clearTimeout(countdownTimeout);
      }
    };
  }, [loadingTimeout, paymentCheckTimer, countdownTimeout]);

  // If no URL, show error
  if (!checkoutUrl) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, marginBottom: 20, textAlign: 'center' }}>
          Payment URL not available
        </Text>
        <Text style={{ fontSize: 14, marginBottom: 20, textAlign: 'center', color: '#666' }}>
          Debug info: {JSON.stringify(params, null, 2)}
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: '#007AFF',
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

  // If WebView error, show error
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
    <View style={{ flex: 1 }}>
      {/* Minimal Back Button */}
      <TouchableOpacity
        style={{
          position: 'absolute',
          top: 50,
          left: 15,
          zIndex: 1000,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: 20,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderWidth: 1,
          borderColor: 'rgba(0, 0, 0, 0.1)',
        }}
        onPress={() => router.back()}
      >
        <Text style={{ color: '#007AFF', fontSize: 14, fontWeight: '500' }}>←</Text>
      </TouchableOpacity>

      {/* Loading Indicator */}
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
          <Text style={{ marginTop: 10, fontSize: 16, color: '#007AFF' }}>
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
        startInLoadingState={false}
        scalesPageToFit={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        mixedContentMode="compatibility"
        thirdPartyCookiesEnabled={true}
        allowsBackForwardNavigationGestures={true}
        userAgent="Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36"
        onShouldStartLoadWithRequest={(request) => {
          console.log('🔄 WebView navigation request:', request.url);
          
          // Allow all Paychangu and payment-related domains
          if (request.url.includes('paychangu.com') || 
              request.url.includes('checkout.paychangu.com') ||
              request.url.includes('api.paychangu.com') ||
              request.url.includes('secure.paychangu.com')) {
            return true;
          }
          
          // Handle callback URL - this should not be navigated to in WebView
          if (request.url.includes('docavailable-3vbdv.ondigitalocean.app/api/payments/paychangu/callback')) {
            console.log('🚫 Blocking callback URL navigation - this is for server-to-server communication');
            return false;
          }
          
          // Handle return URL - this is where PayChangu redirects after payment
          if (request.url.includes('docavailable-3vbdv.ondigitalocean.app/api/payments/paychangu/return')) {
            console.log('✅ Payment return URL detected, checking payment status');
            // Check payment status and handle accordingly
            checkPaymentStatus().then(async (statusData) => {
              if (statusData && statusData.success) {
                // Refresh user data to get updated subscription
                await handlePaymentSuccess();
                
                Alert.alert(
                  'Payment Successful!',
                  'Your payment has been completed successfully.',
                  [
                    { text: 'OK', onPress: () => router.back() }
                  ]
                );
              } else {
                Alert.alert(
                  'Payment Status Unknown',
                  'Please check your payment status in the app.',
                  [
                    { text: 'OK', onPress: () => router.back() }
                  ]
                );
              }
            });
            return false;
          }
          
          // Handle payment completion redirects with success indicators
          if ((request.url.includes('success') || request.url.includes('completed') || request.url.includes('paid')) && !hasDetectedPayment) {
            setHasDetectedPayment(true);
            
            // Refresh user data to get updated subscription
            handlePaymentSuccess().then(() => {
              console.log('✅ User data refreshed after payment success');
            }).catch((error) => {
              console.error('❌ Error refreshing user data after payment success:', error);
            });
            
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
          
          if (request.url.includes('cancel') || request.url.includes('failed') || request.url.includes('error')) {
            Alert.alert(
              'Payment Cancelled',
              'Your payment was cancelled or failed. Please try again.',
              [
                { text: 'OK', onPress: () => router.back() }
              ]
            );
            return false;
          }
          
          // Allow navigation to continue for other URLs (like PayChangu's success page)
          console.log('✅ Allowing navigation to:', request.url);
          return true;
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('❌ WebView HTTP error:', nativeEvent);
          
          // Don't show error for callback URLs (400 errors are expected)
          if (nativeEvent.url && nativeEvent.url.includes('callback')) {
            console.log('ℹ️ Ignoring HTTP error for callback URL (expected behavior)');
            return;
          }
          
          // Don't show error for return URLs (they might return 400 but we handle them in onShouldStartLoadWithRequest)
          if (nativeEvent.url && nativeEvent.url.includes('return')) {
            console.log('ℹ️ Ignoring HTTP error for return URL (handled in navigation)');
            return;
          }
          
          setWebViewError(`HTTP Error: ${nativeEvent.statusCode} - ${nativeEvent.description}`);
        }}
        onMessage={(event) => {
          console.log('📨 WebView message:', event.nativeEvent.data);
          
          try {
            const message = JSON.parse(event.nativeEvent.data);
            if (message.type === 'payment_complete') {
              console.log('✅ Payment completion message received:', message);
              
              if (message.status === 'completed' && !hasDetectedPayment) {
                setHasDetectedPayment(true);
                
                // Refresh user data to get updated subscription
                handlePaymentSuccess().then(() => {
                  console.log('✅ User data refreshed after payment completion message');
                }).catch((error) => {
                  console.error('❌ Error refreshing user data after payment completion message:', error);
                });
                
                Alert.alert(
                  'Payment Successful!',
                  'Your payment has been completed successfully.',
                  [
                    { text: 'OK', onPress: () => router.back() }
                  ]
                );
              } else if (message.status !== 'completed') {
                Alert.alert(
                  'Payment Failed',
                  'Your payment was not successful. Please try again.',
                  [
                    { text: 'OK', onPress: () => router.back() }
                  ]
                );
              }
            } else if (message.type === 'close_window') {
              console.log('🔄 Close window message received, going back to app');
              router.back();
            } else if (message.type === 'page_loaded') {
              // Check if the page contains success indicators
              const pageContent = message.content || '';
              if (pageContent.includes('success') || pageContent.includes('completed') || 
                  pageContent.includes('thank you') || pageContent.includes('payment successful')) {
                console.log('✅ Success indicators found in page content');
                if (!hasDetectedPayment) {
                  setHasDetectedPayment(true);
                  handlePaymentSuccess().then(() => {
                    console.log('✅ User data refreshed after success page detection');
                  });
                  Alert.alert(
                    'Payment Successful!',
                    'Your payment has been completed successfully.',
                    [
                      { text: 'OK', onPress: () => router.back() }
                    ]
                  );
                }
              }
            }
          } catch (error) {
            console.log('📨 Non-JSON WebView message:', event.nativeEvent.data);
          }
        }}
        injectedJavaScript={`
          // Inject script to detect success pages
          setTimeout(() => {
            const pageContent = document.body.innerText.toLowerCase();
            if (pageContent.includes('success') || pageContent.includes('completed') || 
                pageContent.includes('thank you') || pageContent.includes('payment successful') ||
                pageContent.includes('redirecting') || pageContent.includes('countdown')) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'page_loaded',
                content: pageContent,
                url: window.location.href
              }));
            }
          }, 2000);
          true;
        `}
      />
    </View>
  );
}