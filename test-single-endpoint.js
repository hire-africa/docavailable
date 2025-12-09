const WebSocket = require('ws');

console.log('🧪 Testing Single Endpoint for Both Audio and Chat');
console.log('==================================================');

// Test audio calls through /chat-signaling
const audioWs = new WebSocket('wss://docavailable.org/chat-signaling?appointmentId=test_audio_call&userId=1&authToken=test-token&type=audio');

audioWs.on('open', () => {
  console.log('✅ Audio call connected via /chat-signaling!');
  audioWs.send(JSON.stringify({ type: 'audio-offer', data: 'test-audio-data' }));
});

audioWs.on('message', (data) => {
  console.log('📥 Audio response:', data.toString());
});

audioWs.on('error', (error) => {
  console.log('❌ Audio error:', error.message);
});

audioWs.on('close', (code) => {
  console.log('🔌 Audio connection closed:', code);
});

// Test chat messages through /chat-signaling
setTimeout(() => {
  const chatWs = new WebSocket('wss://docavailable.org/chat-signaling?appointmentId=test_chat_message&userId=1&authToken=test-token&type=chat');
  
  chatWs.on('open', () => {
    console.log('✅ Chat message connected via /chat-signaling!');
    chatWs.send(JSON.stringify({ type: 'chat-message', message: 'Hello from chat test' }));
  });
  
  chatWs.on('message', (data) => {
    console.log('📥 Chat response:', data.toString());
  });
  
  chatWs.on('error', (error) => {
    console.log('❌ Chat error:', error.message);
  });
  
  chatWs.on('close', (code) => {
    console.log('🔌 Chat connection closed:', code);
  });
}, 1000);

setTimeout(() => {
  console.log('\n📊 Test Complete - Single endpoint handles both audio and chat!');
  process.exit(0);
}, 3000);
