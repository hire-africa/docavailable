/**
 * Clear Corrupted Auth Data Script
 * 
 * This script clears corrupted authentication data from AsyncStorage.
 * Run this if you see HTML error messages stored as user data.
 * 
 * Usage:
 * 1. Import this in your app's root file temporarily
 * 2. Call clearCorruptedAuth() on app start
 * 3. Remove after clearing
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export async function clearCorruptedAuth() {
  try {
    console.log('🧹 Checking for corrupted auth data...');
    
    const userData = await AsyncStorage.getItem('user_data');
    const authToken = await AsyncStorage.getItem('auth_token');
    
    let needsClear = false;
    
    // Check if user_data contains HTML error
    if (userData && (userData.includes('<br />') || userData.includes('PostTooLargeException'))) {
      console.log('❌ Found corrupted user_data (contains HTML error)');
      needsClear = true;
    }
    
    // Check if user_data is not valid JSON
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        if (typeof parsed === 'string' || !parsed.id) {
          console.log('❌ Found invalid user_data structure');
          needsClear = true;
        }
      } catch (e) {
        console.log('❌ user_data is not valid JSON');
        needsClear = true;
      }
    }
    
    if (needsClear) {
      console.log('🧹 Clearing corrupted auth data...');
      await AsyncStorage.removeItem('user_data');
      await AsyncStorage.removeItem('auth_token');
      console.log('✅ Corrupted auth data cleared successfully');
      return true;
    } else {
      console.log('✅ No corrupted auth data found');
      return false;
    }
  } catch (error) {
    console.error('❌ Error clearing corrupted auth:', error);
    return false;
  }
}

// Auto-run on import (for quick fixes)
if (typeof global !== 'undefined') {
  clearCorruptedAuth().then(cleared => {
    if (cleared) {
      console.log('🔄 Please restart the app for changes to take effect');
    }
  });
}
