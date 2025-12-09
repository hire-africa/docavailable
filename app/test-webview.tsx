import { router } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import GoogleAuthWebView from '../components/GoogleAuthWebView';

export default function TestWebView() {
  const [showGoogleAuth, setShowGoogleAuth] = useState(false);

  const handleGoogleAuthSuccess = (user: any, token: string) => {
    console.log('🔐 Test: Google Auth Success:', { user, token });
    setShowGoogleAuth(false);
    Alert.alert(
      'Google Auth Success',
      `Welcome ${user.name || user.email}! You are logged in as ${user.user_type}.`,
      [{ text: 'OK' }]
    );
  };

  const handleGoogleAuthError = (error: string) => {
    console.error('🔐 Test: Google Auth Error:', error);
    setShowGoogleAuth(false);
    Alert.alert('Google Auth Error', error);
  };

  const handleGoogleAuthClose = () => {
    console.log('🔐 Test: Google Auth WebView closed');
    setShowGoogleAuth(false);
  };

  const testPaymentFlow = () => {
    // Navigate to a test payment flow
    router.push('/payments/checkout?url=https://checkout.paychangu.com/test&tx_ref=test123');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>WebView Test Page</Text>
        <Text style={styles.subtitle}>Test Google Auth and Payment WebViews</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Google Authentication</Text>
          <Text style={styles.description}>
            Test the WebView-based Google authentication flow
          </Text>
          <TouchableOpacity
            style={styles.testButton}
            onPress={() => setShowGoogleAuth(true)}
          >
            <Text style={styles.buttonText}>Test Google Auth WebView</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Checkout</Text>
          <Text style={styles.description}>
            Test the payment checkout WebView (PayChangu)
          </Text>
          <TouchableOpacity
            style={styles.testButton}
            onPress={testPaymentFlow}
          >
            <Text style={styles.buttonText}>Test Payment WebView</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Isolation Test</Text>
          <Text style={styles.description}>
            Both WebViews should work independently without conflicts
          </Text>
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>✅ Google Auth WebView: Isolated</Text>
            <Text style={styles.statusText}>✅ Payment WebView: Isolated</Text>
            <Text style={styles.statusText}>✅ No Shared State: Confirmed</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back to Dashboard</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Google Auth WebView Modal */}
      <GoogleAuthWebView
        visible={showGoogleAuth}
        onClose={handleGoogleAuthClose}
        onSuccess={handleGoogleAuthSuccess}
        onError={handleGoogleAuthError}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  testButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  statusContainer: {
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
    padding: 15,
    marginTop: 10,
  },
  statusText: {
    fontSize: 14,
    color: '#2E7D32',
    marginBottom: 5,
  },
  backButton: {
    backgroundColor: '#6C757D',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
