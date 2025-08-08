import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { apiService } from '../../services/apiService';

export default function PayChanguCheckout() {
  const params = useLocalSearchParams();
  const checkoutUrl = (params.url as string) || '';
  const txRef = (params.tx_ref as string) || '';

  const handleIntercept = useCallback(async (url: string) => {
    const callback = 'https://docavailable-1.onrender.com/api/payments/paychangu/callback';
    const ret = 'https://docavailable-1.onrender.com/api/payments/paychangu/return';

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
    router.back();
    return null;
  }

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
      />
    </SafeAreaView>
  );
}