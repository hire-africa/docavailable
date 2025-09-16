import { router } from 'expo-router';
import { Alert, NativeModules, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TestWebView() {
  const testRNCWebView = () => {
    console.log('🧪 Testing RNCWebView module linking...');
    
    try {
      const webViewModule = NativeModules.RNCWebView;
      console.log('✅ RNCWebView module found:', webViewModule);
      
      if (webViewModule) {
        console.log('✅ WebView module is properly linked!');
        console.log('📋 Available methods:', Object.keys(webViewModule));
        Alert.alert('Success', 'RNCWebView module is properly linked!');
      } else {
        console.log('❌ RNCWebView module is null/undefined');
        Alert.alert('Error', 'RNCWebView module is null/undefined');
      }
    } catch (error) {
      console.log('❌ Error accessing RNCWebView module:', error.message);
      Alert.alert('Error', `Error accessing RNCWebView module: ${error.message}`);
    }
  };

  const testWebViewComponent = () => {
    console.log('🧪 Testing WebView component...');
    
    try {
      const { WebView } = require('react-native-webview');
      console.log('✅ WebView component imported:', typeof WebView);
      Alert.alert('Success', 'WebView component imported successfully!');
    } catch (error) {
      console.log('❌ Error importing WebView component:', error.message);
      Alert.alert('Error', `Error importing WebView component: ${error.message}`);
    }
  };

  const testTurboModule = () => {
    console.log('🧪 Testing TurboModuleRegistry...');
    
    try {
      const { TurboModuleRegistry } = require('react-native');
      const webViewTurboModule = TurboModuleRegistry.getEnforcing('RNCWebView');
      console.log('✅ RNCWebView TurboModule found:', webViewTurboModule);
      Alert.alert('Success', 'RNCWebView TurboModule found!');
    } catch (error) {
      console.log('❌ RNCWebView TurboModule not found:', error.message);
      Alert.alert('Error', `RNCWebView TurboModule not found: ${error.message}`);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 30, textAlign: 'center' }}>
        WebView Module Test
      </Text>
      
      <TouchableOpacity
        style={{
          backgroundColor: '#007AFF',
          padding: 15,
          borderRadius: 8,
          marginBottom: 15,
        }}
        onPress={testRNCWebView}
      >
        <Text style={{ color: 'white', fontSize: 16, textAlign: 'center' }}>
          Test RNCWebView Module
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{
          backgroundColor: '#34C759',
          padding: 15,
          borderRadius: 8,
          marginBottom: 15,
        }}
        onPress={testWebViewComponent}
      >
        <Text style={{ color: 'white', fontSize: 16, textAlign: 'center' }}>
          Test WebView Component Import
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{
          backgroundColor: '#FF9500',
          padding: 15,
          borderRadius: 8,
          marginBottom: 15,
        }}
        onPress={testTurboModule}
      >
        <Text style={{ color: 'white', fontSize: 16, textAlign: 'center' }}>
          Test TurboModuleRegistry
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{
          backgroundColor: '#8E8E93',
          padding: 15,
          borderRadius: 8,
        }}
        onPress={() => router.back()}
      >
        <Text style={{ color: 'white', fontSize: 16, textAlign: 'center' }}>
          Go Back
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
