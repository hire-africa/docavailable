const WebSocket = require('ws');

// Test the enhanced unified signaling server
async function testUnifiedSignalingServer() {
  console.log('🧪 Testing Enhanced Unified Signaling Server...\n');

  const appointmentId = 'test-appointment-123';
  const userId1 = 'user-1';
  const userId2 = 'user-2';

  // Create two WebSocket connections to the same appointment
  const ws1 = new WebSocket(`ws://localhost:8081/chat-signaling?appointmentId=${appointmentId}&userId=${userId1}`);
  const ws2 = new WebSocket(`ws://localhost:8081/chat-signaling?appointmentId=${appointmentId}&userId=${userId2}`);

  let ws1Connected = false;
  let ws2Connected = false;

  // Wait for both connections
  await new Promise((resolve) => {
    ws1.on('open', () => {
      console.log('✅ User 1 connected to unified signaling server');
      ws1Connected = true;
      if (ws2Connected) resolve();
    });

    ws2.on('open', () => {
      console.log('✅ User 2 connected to unified signaling server');
      ws2Connected = true;
      if (ws1Connected) resolve();
    });
  });

  console.log('\n📞 Testing WebRTC Call Offer...');

  // User 1 sends audio call offer
  const audioOffer = {
    type: 'offer',
    offer: {
      type: 'offer',
      sdp: 'test-audio-sdp-offer'
    },
    senderId: userId1,
    callType: 'audio',
    appointmentId: appointmentId,
    userId: userId1,
    timestamp: new Date().toISOString()
  };

  ws1.send(JSON.stringify(audioOffer));
  console.log('📤 User 1 sent audio call offer');

  // User 2 receives the offer
  ws2.on('message', (data) => {
    const message = JSON.parse(data);
    console.log(`📨 User 2 received: ${message.type}`);
    
    if (message.type === 'offer') {
      console.log('✅ Offer received by User 2');
      
      // User 2 sends answer
      const answer = {
        type: 'answer',
        answer: {
          type: 'answer',
          sdp: 'test-audio-sdp-answer'
        },
        senderId: userId2,
        appointmentId: appointmentId,
        userId: userId2,
        timestamp: new Date().toISOString()
      };
      
      ws2.send(JSON.stringify(answer));
      console.log('📤 User 2 sent answer');
    }
  });

  // User 1 receives the answer
  ws1.on('message', (data) => {
    const message = JSON.parse(data);
    console.log(`📨 User 1 received: ${message.type}`);
    
    if (message.type === 'answer') {
      console.log('✅ Answer received by User 1');
    }
  });

  // Test chat message
  console.log('\n💬 Testing Chat Message...');
  
  const chatMessage = {
    type: 'chat-message',
    message: {
      id: 'msg-123',
      message: 'Hello, this is a test message',
      sender_id: userId1,
      message_type: 'text',
      created_at: new Date().toISOString()
    },
    appointmentId: appointmentId
  };

  ws1.send(JSON.stringify(chatMessage));
  console.log('📤 User 1 sent chat message');

  // Test call ended
  setTimeout(() => {
    console.log('\n📞 Testing Call Ended...');
    
    const callEnded = {
      type: 'call-ended',
      senderId: userId1,
      appointmentId: appointmentId,
      userId: userId1,
      sessionDuration: 30,
      timestamp: new Date().toISOString()
    };
    
    ws1.send(JSON.stringify(callEnded));
    console.log('📤 User 1 sent call-ended');
  }, 2000);

  // Close connections after test
  setTimeout(() => {
    console.log('\n🔌 Closing connections...');
    ws1.close();
    ws2.close();
    console.log('✅ Test completed successfully!');
    process.exit(0);
  }, 5000);
}

// Run the test
testUnifiedSignalingServer().catch(console.error);
