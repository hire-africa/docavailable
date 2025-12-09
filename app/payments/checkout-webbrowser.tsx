import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PayChanguCheckout() {
  const params = useLocalSearchParams();
  
  // Get parameters from route params
  const checkoutUrl = (params.url as string) || '';
  const txRef = (params.tx_ref as string) || '';
  const [isLoading, setIsLoading] = useState(false);

  console.log('🎯 PayChanguCheckout component rendered');
  console.log('🎯 Received params:', params);
  console.log('🎯 Checkout URL:', checkoutUrl);
  console.log('🎯 Transaction Ref:', txRef);
  console.log('🎯 Using Expo WebBrowser for payment flow');

  // Open payment URL in WebBrowser
  const openPayment = async () => {
    if (!checkoutUrl) {
      Alert.alert('Error', 'No payment URL provided');
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('🌐 Opening payment URL in WebBrowser:', checkoutUrl);
      
      const result = await WebBrowser.openBrowserAsync(checkoutUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
        controlsColor: '#4CAF50',
        showTitle: true,
        enableBarCollapsing: false,
        showInRecents: true,
      });

      console.log('🔍 WebBrowser result:', result);

      // Handle the result
      if (result.type === 'dismiss') {
        // User dismissed the browser
        Alert.alert(
          'Payment Cancelled',
          'Your payment was cancelled. Please try again.',
          [
            { text: 'OK', onPress: () => router.back() }
          ]
        );
      } else if (result.type === 'cancel') {
        // User cancelled
        Alert.alert(
          'Payment Cancelled',
          'Your payment was cancelled. Please try again.',
          [
            { text: 'OK', onPress: () => router.back() }
          ]
        );
      }
      
    } catch (error) {
      console.error('❌ WebBrowser error:', error);
      Alert.alert(
        'Error',
        'Failed to open payment page. Please try again.',
        [
          { text: 'OK', onPress: () => router.back() }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-open payment when component mounts
  useEffect(() => {
    if (checkoutUrl) {
      openPayment();
    }
  }, [checkoutUrl]);

  // Check payment status (placeholder - you'll need to implement this)
  const checkPaymentStatus = async () => {
    console.log('🔍 Checking payment status for transaction:', txRef);
    // Implement your payment status check logic here
    // This could be a polling mechanism or webhook callback
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        
        {/* Header */}
        <View style={{ marginBottom: 30, alignItems: 'center' }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#222', marginBottom: 10 }}>
            Payment Processing
          </Text>
          <Text style={{ fontSize: 16, color: '#666', textAlign: 'center' }}>
            {isLoading ? 'Opening payment page...' : 'Ready to process payment'}
          </Text>
        </View>

        {/* Loading Indicator */}
        {isLoading && (
          <View style={{ marginBottom: 30, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>
              Please wait...
            </Text>
          </View>
        )}

        {/* Payment Info */}
        <View style={{ 
          backgroundColor: '#fff', 
          borderRadius: 12, 
          padding: 20, 
          marginBottom: 30,
          width: '100%',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#222', marginBottom: 10 }}>
            Transaction Details
          </Text>
          <Text style={{ fontSize: 14, color: '#666', marginBottom: 5 }}>
            Reference: {txRef || 'N/A'}
          </Text>
          <Text style={{ fontSize: 14, color: '#666' }}>
            Provider: PayChangu
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={{ width: '100%', gap: 12 }}>
          <TouchableOpacity
            style={{
              backgroundColor: '#4CAF50',
              padding: 16,
              borderRadius: 8,
              alignItems: 'center',
            }}
            onPress={openPayment}
            disabled={isLoading}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
              {isLoading ? 'Opening...' : 'Open Payment Page'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: '#8E8E93',
              padding: 16,
              borderRadius: 8,
              alignItems: 'center',
            }}
            onPress={() => router.back()}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
              Cancel Payment
            </Text>
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={{ marginTop: 30, padding: 16, backgroundColor: '#E8F5E8', borderRadius: 8, width: '100%' }}>
          <Text style={{ fontSize: 14, color: '#2E7D32', textAlign: 'center', lineHeight: 20 }}>
            💡 The payment page will open in your browser. Complete the payment and return to the app.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
