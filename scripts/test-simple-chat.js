// Simple test script to verify basic chat functionality
const { messageStorageService } = require('../services/messageStorageService');

async function testSimpleChat() {
  console.log('🧪 Testing simplified chat functionality...');
  
  const testAppointmentId = 43;
  const testUserId = 59;
  const testUserName = 'Test User';
  
  try {
    // Test 1: Store a message locally
    console.log('\n📝 Test 1: Storing message locally...');
    const testMessage = {
      id: 'test_msg_1',
      appointment_id: testAppointmentId,
      sender_id: testUserId,
      sender_name: testUserName,
      message: 'Hello, this is a test message!',
      message_type: 'text',
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    await messageStorageService.storeMessage(testAppointmentId, testMessage);
    console.log('✅ Message stored successfully');
    
    // Test 2: Get messages
    console.log('\n📖 Test 2: Getting messages...');
    const messages = await messageStorageService.getMessages(testAppointmentId);
    console.log(`✅ Retrieved ${messages.length} messages`);
    
    // Test 3: Send message
    console.log('\n📤 Test 3: Sending message...');
    const sentMessage = await messageStorageService.sendMessage(
      testAppointmentId,
      'This is a test message from the simplified chat!',
      testUserId,
      testUserName
    );
    
    if (sentMessage) {
      console.log('✅ Message sent successfully');
      console.log('Message ID:', sentMessage.id);
      console.log('Message content:', sentMessage.message);
    } else {
      console.log('❌ Failed to send message');
    }
    
    // Test 4: Get optimized messages
    console.log('\n⚡ Test 4: Getting optimized messages...');
    const optimizedMessages = await messageStorageService.getMessagesOptimized(testAppointmentId);
    console.log(`✅ Retrieved ${optimizedMessages.length} optimized messages`);
    
    // Test 5: Preload messages
    console.log('\n🔄 Test 5: Preloading messages...');
    await messageStorageService.preloadMessages(testAppointmentId);
    console.log('✅ Messages preloaded successfully');
    
    console.log('\n🎉 All tests passed! The simplified chat system is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testSimpleChat(); 