import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { apiService } from '../../app/services/apiService';

export default function PayChanguCheckout() {
  const params = useLocalSearchParams();
  const checkoutUrl = (params.url as string) || '';
  const txRef = (params.tx_ref as string) || '';

  useEffect(() => {
    console.log('Checkout Debug:', {
      checkoutUrl,
      txRef,
      params: params
    });
  }, [checkoutUrl, txRef, params]);

  const handleIntercept = useCallback(async (url: string) => {
    console.log('WebView URL intercepted:', url);
      const callback = 'https://docavailable-3vbdv.ondigitalocean.app/api/payments/paychangu/callback';
  const ret = 'https://docavailable-3vbdv.ondigitalocean.app/api/payments/paychangu/return';

    if (url.startsWith(callback) || url.startsWith(ret)) {
      try {
        // Optionally verify on the client side and show a quick result
        if (txRef) {
          const res = await apiService.get(`/payments/status?transaction_id=${encodeURIComponent(txRef)}`);
          if (res?.success && ((res.data as any)?.status === 'completed' || (res.data as any)?.status === 'success')) {
            Alert.alert('Payment Successful', 'Your plan has been activated.');
          } else {
            Alert.alert('Payment Processing', 'We are verifying your payment. Your plan will be activated shortly.');
          }
        }
      } catch (err) {
        // Ignore errors here; server-side callback already processed
      } finally {
        router.back();
      }
      return false;
    }
    return true;
  }, [txRef]);

  if (!checkoutUrl) {
    console.log('No checkout URL provided, going back');
    router.back();
    return null;
  }

  console.log('Rendering WebView with URL:', checkoutUrl);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <WebView
        source={{ uri: checkoutUrl }}
        startInLoadingState
        javaScriptEnabled={true}
        domStorageEnabled={true}
        thirdPartyCookiesEnabled={true}
        mixedContentMode="compatibility"
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        renderLoading={() => (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" />
          </View>
        )}
        onShouldStartLoadWithRequest={(req) => {
          try {
            // Call handleIntercept synchronously to avoid Promise return type
            const result = handleIntercept(req.url);
            if (result instanceof Promise) {
              // If it returns a Promise, we need to handle it differently
              result.catch(error => {
                console.log('Error in onShouldStartLoadWithRequest:', error);
              });
              return true; // Allow loading while processing
            }
            return result;
          } catch (error) {
            console.log('Error in onShouldStartLoadWithRequest:', error);
            return true;
          }
        }}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.log('WebView error:', nativeEvent);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.log('WebView HTTP error:', nativeEvent);
        }}
        onLoadStart={() => {
          console.log('WebView load started');
        }}
        onLoadEnd={() => {
          console.log('WebView load ended');
        }}
      />
    </SafeAreaView>
  );
}