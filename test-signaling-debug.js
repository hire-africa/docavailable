const WebSocket = require('ws');

// Test WebSocket connection to signaling server
const testConnection = () => {
  console.log('🔌 Testing WebSocket connection to signaling server...');
  
  const ws = new WebSocket('ws://localhost:8080/audio-signaling?appointmentId=test_session_123&userId=1', {
    perMessageDeflate: false,
    compression: false
  });
  
  ws.on('open', () => {
    console.log('✅ Connected to signaling server');
    
    // Send a test offer
    const testOffer = {
      type: 'offer',
      offer: {
        type: 'offer',
        sdp: 'test-sdp-data'
      },
      senderId: '1',
      userId: '1',
      callType: 'video'
    };
    
    console.log('📤 Sending test offer...');
    ws.send(JSON.stringify(testOffer));
  });
  
  ws.on('message', (data) => {
    const message = JSON.parse(data);
    console.log('📨 Received message:', message.type);
    
    if (message.type === 'offer') {
      console.log('✅ Received offer from another client');
    }
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
  
  ws.on('close', () => {
    console.log('🔌 Connection closed');
  });
};

// Test with two connections
setTimeout(() => {
  console.log('🔌 Creating second connection...');
  const ws2 = new WebSocket('ws://localhost:8080/audio-signaling?appointmentId=test_session_123&userId=2', {
    perMessageDeflate: false,
    compression: false
  });
  
  ws2.on('open', () => {
    console.log('✅ Second connection established');
  });
  
  ws2.on('message', (data) => {
    const message = JSON.parse(data);
    console.log('📨 Second client received:', message.type);
  });
}, 2000);

testConnection();
