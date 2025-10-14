// Script to clear configuration cache and force reload
const configService = require('./services/configService.ts').default;

console.log('🔄 Clearing configuration cache...');

// Clear the cache
configService.clearCache();

// Force reload the configuration
const newConfig = configService.reloadConfig();

console.log('🔧 New WebRTC Configuration:');
console.log('  Signaling URL:', newConfig.webrtc.signalingUrl);
console.log('  Chat Signaling URL:', newConfig.webrtc.chatSignalingUrl);

// Check if the URLs are correct now
const isCorrect = 
  newConfig.webrtc.signalingUrl === 'wss://docavailable.org/call-signaling' &&
  newConfig.webrtc.chatSignalingUrl === 'wss://docavailable.org/chat-signaling';

console.log('✅ Configuration is now correct:', isCorrect);

if (isCorrect) {
  console.log('🎉 SUCCESS! Configuration has been updated to use docavailable.org');
  console.log('📱 Please restart your app to see the changes take effect.');
} else {
  console.log('❌ Configuration still has wrong URLs!');
  console.log('   Expected: wss://docavailable.org/call-signaling');
  console.log('   Got:      ', newConfig.webrtc.signalingUrl);
  console.log('   Expected: wss://docavailable.org/chat-signaling');
  console.log('   Got:      ', newConfig.webrtc.chatSignalingUrl);
}

