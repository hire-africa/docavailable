/**
 * Frontend test script to verify voice recording functionality
 * This script tests the voice recording service and API integration
 */

console.log('🎤 Testing Voice Recording Frontend\n');

// Test 1: Check if expo-av is available
console.log('Test 1: Checking expo-av availability');
try {
  const { Audio } = require('expo-av');
  console.log('✅ expo-av is available');
  
  // Test audio mode setup
  console.log('Test 1.1: Testing audio mode setup');
  Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    staysActiveInBackground: true,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  }).then(() => {
    console.log('✅ Audio mode setup successful');
  }).catch((error) => {
    console.log('❌ Audio mode setup failed:', error.message);
  });
  
} catch (error) {
  console.log('❌ expo-av is not available:', error.message);
}

// Test 2: Check voice recording service
console.log('\nTest 2: Checking voice recording service');
try {
  const voiceRecordingService = require('../services/voiceRecordingService');
  console.log('✅ Voice recording service is available');
  
  // Test duration formatting
  console.log('Test 2.1: Testing duration formatting');
  const testDuration = voiceRecordingService.formatDuration(125); // 2:05
  console.log('✅ Duration formatting:', testDuration);
  
} catch (error) {
  console.log('❌ Voice recording service is not available:', error.message);
}

// Test 3: Check API service
console.log('\nTest 3: Checking API service');
try {
  const { apiService } = require('../app/services/apiService');
  console.log('✅ API service is available');
  
  // Test API service methods
  console.log('Test 3.1: Testing API service methods');
  if (apiService && typeof apiService.post === 'function') {
    console.log('✅ API service post method available');
  } else {
    console.log('❌ API service post method not available');
  }
  
} catch (error) {
  console.log('❌ API service is not available:', error.message);
}

// Test 4: Check message storage service
console.log('\nTest 4: Checking message storage service');
try {
  const { messageStorageService } = require('../services/messageStorageService');
  console.log('✅ Message storage service is available');
  
  // Test sendVoiceMessage method
  console.log('Test 4.1: Testing sendVoiceMessage method');
  if (messageStorageService && typeof messageStorageService.sendVoiceMessage === 'function') {
    console.log('✅ sendVoiceMessage method available');
  } else {
    console.log('❌ sendVoiceMessage method not available');
  }
  
} catch (error) {
  console.log('❌ Message storage service is not available:', error.message);
}

// Test 5: Check voice message player component
console.log('\nTest 5: Checking voice message player component');
try {
  const VoiceMessagePlayer = require('../components/VoiceMessagePlayer');
  console.log('✅ Voice message player component is available');
  
  // Test component props
  console.log('Test 5.1: Testing component props');
  if (VoiceMessagePlayer && VoiceMessagePlayer.default) {
    console.log('✅ VoiceMessagePlayer component exported correctly');
  } else {
    console.log('❌ VoiceMessagePlayer component not exported correctly');
  }
  
} catch (error) {
  console.log('❌ Voice message player component is not available:', error.message);
}

// Test 6: Check chat component integration
console.log('\nTest 6: Checking chat component integration');
try {
  const chatComponent = require('../app/chat/[appointmentId].tsx');
  console.log('✅ Chat component is available');
  
  // Check for voice recording imports
  console.log('Test 6.1: Checking voice recording imports');
  const fs = require('fs');
  const chatContent = fs.readFileSync('../app/chat/[appointmentId].tsx', 'utf8');
  
  if (chatContent.includes('voiceRecordingService')) {
    console.log('✅ Voice recording service imported in chat component');
  } else {
    console.log('❌ Voice recording service not imported in chat component');
  }
  
  if (chatContent.includes('VoiceMessagePlayer')) {
    console.log('✅ VoiceMessagePlayer imported in chat component');
  } else {
    console.log('❌ VoiceMessagePlayer not imported in chat component');
  }
  
  if (chatContent.includes('isRecording')) {
    console.log('✅ Recording state variables defined in chat component');
  } else {
    console.log('❌ Recording state variables not defined in chat component');
  }
  
} catch (error) {
  console.log('❌ Chat component is not available:', error.message);
}

// Test 7: Check FormData compatibility
console.log('\nTest 7: Checking FormData compatibility');
try {
  const FormData = global.FormData || require('form-data');
  console.log('✅ FormData is available');
  
  // Test FormData creation
  console.log('Test 7.1: Testing FormData creation');
  const formData = new FormData();
  formData.append('test', 'value');
  console.log('✅ FormData creation successful');
  
} catch (error) {
  console.log('❌ FormData is not available:', error.message);
}

console.log('\n🎉 Frontend voice recording tests completed!');
console.log('\nNext steps to test:');
console.log('1. Run the app and navigate to a chat');
console.log('2. Tap the microphone button to start recording');
console.log('3. Speak for a few seconds');
console.log('4. Tap the stop button to end recording');
console.log('5. Tap send to upload the voice message');
console.log('6. Check the console for any error messages');
console.log('\nIf you see 422 errors, check:');
console.log('- File type and size');
console.log('- Authentication token');
console.log('- Network connectivity');
console.log('- Backend logs for validation errors'); 