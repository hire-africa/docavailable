// Test script to check if RNCWebView is properly linked
import { NativeModules } from 'react-native';

console.log('🧪 Testing RNCWebView module linking...');

try {
  // Check if RNCWebView module exists
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

// Also test the WebView component import
try {
  const { WebView } = require('react-native-webview');
  console.log('✅ WebView component imported successfully:', typeof WebView);
} catch (error) {
  console.log('❌ Error importing WebView component:', error.message);
}

// Test TurboModuleRegistry
try {
  const { TurboModuleRegistry } = require('react-native');
  const webViewTurboModule = TurboModuleRegistry.getEnforcing('RNCWebView');
  console.log('✅ RNCWebView TurboModule found:', webViewTurboModule);
} catch (error) {
  console.log('❌ RNCWebView TurboModule not found:', error.message);
}
