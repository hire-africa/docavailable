const WebSocket = require('ws');

// Test video call signaling
async function testVideoCallSignaling() {
  console.log('🧪 Testing Video Call Signaling...\n');

  const appointmentId = 'test-video-appointment-123';
  const userId1 = 'user-1';
  const userId2 = 'user-2';

  // Create two WebSocket connections
  const ws1 = new WebSocket(`ws://46.101.123.123:8080/audio-signaling/${appointmentId}`);
  const ws2 = new WebSocket(`ws://46.101.123.123:8080/audio-signaling/${appointmentId}`);

  let ws1Connected = false;
  let ws2Connected = false;

  // Wait for both connections
  await new Promise((resolve) => {
    ws1.on('open', () => {
      console.log('✅ User 1 connected to signaling server');
      ws1Connected = true;
      if (ws2Connected) resolve();
    });

    ws2.on('open', () => {
      console.log('✅ User 2 connected to signaling server');
      ws2Connected = true;
      if (ws1Connected) resolve();
    });
  });

  console.log('\n📞 Testing Video Call Offer...');

  // User 1 sends video call offer
  const videoOffer = {
    type: 'offer',
    offer: {
      type: 'offer',
      sdp: 'test-sdp-offer'
    },
    senderId: userId1,
    callType: 'video',
    appointmentId: appointmentId,
    userId: userId1,
    timestamp: new Date().toISOString()
  };

  ws1.send(JSON.stringify(videoOffer));
  console.log('📤 User 1 sent video call offer');

  // User 2 receives the offer
  ws2.on('message', (data) => {
    const message = JSON.parse(data);
    console.log('📨 User 2 received message:', message.type);
    
    if (message.type === 'offer' && message.callType === 'video') {
      console.log('✅ Video call offer received by User 2');
      console.log('📹 Call type detected as video:', message.callType);
      
      // User 2 sends answer
      const videoAnswer = {
        type: 'answer',
        answer: {
          type: 'answer',
          sdp: 'test-sdp-answer'
        },
        senderId: userId2,
        callType: 'video',
        appointmentId: appointmentId,
        userId: userId2,
        timestamp: new Date().toISOString()
      };
      
      ws2.send(JSON.stringify(videoAnswer));
      console.log('📤 User 2 sent video call answer');
    }
  });

  // User 1 receives the answer
  ws1.on('message', (data) => {
    const message = JSON.parse(data);
    console.log('📨 User 1 received message:', message.type);
    
    if (message.type === 'answer' && message.callType === 'video') {
      console.log('✅ Video call answer received by User 1');
      console.log('📹 Call type detected as video:', message.callType);
      console.log('\n🎉 Video call signaling test completed successfully!');
      
      // Close connections
      ws1.close();
      ws2.close();
      process.exit(0);
    }
  });

  // Handle errors
  ws1.on('error', (error) => {
    console.error('❌ User 1 WebSocket error:', error);
  });

  ws2.on('error', (error) => {
    console.error('❌ User 2 WebSocket error:', error);
  });

  // Timeout after 10 seconds
  setTimeout(() => {
    console.log('⏰ Test timeout - closing connections');
    ws1.close();
    ws2.close();
    process.exit(1);
  }, 10000);
}

// Run the test
testVideoCallSignaling().catch(console.error);
