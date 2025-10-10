const WebSocket = require('ws');

console.log('🧪 Testing App Connection to Production Server');
console.log('==============================================');

// Test audio signaling (what your app uses)
const audioWs = new WebSocket('wss://docavailable.org/audio-signaling?appointmentId=test_app_audio&userId=1&authToken=test-token');

audioWs.on('open', () => {
  console.log('✅ Audio signaling connected successfully!');
  audioWs.send(JSON.stringify({ type: 'test', message: 'Hello from app test' }));
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

// Test chat signaling (what your app uses)
setTimeout(() => {
  const chatWs = new WebSocket('wss://docavailable.org/chat-signaling?appointmentId=test_app_chat&userId=1&authToken=test-token');
  
  chatWs.on('open', () => {
    console.log('✅ Chat signaling connected successfully!');
    chatWs.send(JSON.stringify({ type: 'test', message: 'Hello from app test' }));
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
  console.log('\n📊 Test Complete - Your app should be able to connect!');
  process.exit(0);
}, 3000);
