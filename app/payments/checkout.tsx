import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect } from 'react';
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
      const callback = 'https://docavailable-5.onrender.com/api/payments/paychangu/callback';
  const ret = 'https://docavailable-5.onrender.com/api/payments/paychangu/return';

    if (url.startsWith(callback) || url.startsWith(ret)) {
      try {
        // Optionally verify on the client side and show a quick result
        if (txRef) {
          const res = await apiService.get(`/payments/status?transaction_id=${encodeURIComponent(txRef)}`);
          if (res?.success && (res.status === 'completed' || res.status === 'success')) {
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
        renderLoading={() => (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" />
          </View>
        )}
        onShouldStartLoadWithRequest={(req) => handleIntercept(req.url)}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.log('WebView error:', nativeEvent);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.log('WebView HTTP error:', nativeEvent);
        }}
      />
    </SafeAreaView>
  );
}