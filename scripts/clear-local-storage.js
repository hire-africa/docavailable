// Script to clear local storage for text sessions
// This can be run in the React Native app console or as a development tool

const AsyncStorage = require('@react-native-async-storage/async-storage');

async function clearLocalStorage() {
  console.log('🧹 Clearing Local Storage');
  console.log('=========================\n');

  try {
    // Get all keys
    const allKeys = await AsyncStorage.getAllKeys();
    console.log(`Found ${allKeys.length} total keys`);

    // Filter for text session related keys
    const sessionKeys = allKeys.filter(key => 
      key.startsWith('text_session_') || 
      key.startsWith('session_key_') || 
      key.startsWith('session_metadata_')
    );

    console.log(`Found ${sessionKeys.length} session-related keys:`);
    sessionKeys.forEach(key => console.log(`- ${key}`));

    if (sessionKeys.length === 0) {
      console.log('✅ No session data found in local storage');
      return;
    }

    // Clear session data
    await AsyncStorage.multiRemove(sessionKeys);
    console.log('✅ Cleared all session data from local storage');

    // Verify clearing
    const remainingKeys = await AsyncStorage.getAllKeys();
    const remainingSessionKeys = remainingKeys.filter(key => 
      key.startsWith('text_session_') || 
      key.startsWith('session_key_') || 
      key.startsWith('session_metadata_')
    );

    if (remainingSessionKeys.length === 0) {
      console.log('✅ Verification: All session data cleared successfully');
    } else {
      console.log(`⚠️  Warning: ${remainingSessionKeys.length} session keys still remain`);
    }

  } catch (error) {
    console.error('❌ Error clearing local storage:', error);
  }
}

// For React Native console usage
if (typeof global !== 'undefined') {
  global.clearLocalStorage = clearLocalStorage;
}

// For Node.js usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { clearLocalStorage };
}

console.log('📱 Local Storage Clear Script Loaded');
console.log('Run clearLocalStorage() to clear all session data'); 