const axios = require('axios');

const BASE_URL = 'http://172.20.10.11:8000/api';

async function testRealtimeMessages() {
  console.log('🔄 Testing Real-time Messages');
  console.log('============================\n');

  try {
    // Step 1: Login as patient
    console.log('1. Logging in as patient...');
    const patientLoginResponse = await axios.post(`${BASE_URL}/login`, {
      email: 'patient@test.com', // Replace with actual patient user
      password: 'password123'
    });

    if (!patientLoginResponse.data.success) {
      console.error('Patient login failed:', patientLoginResponse.data.message);
      return;
    }

    const patientToken = patientLoginResponse.data.data.token;
    const patient = patientLoginResponse.data.data.user;
    console.log('✅ Patient logged in:', patient.first_name, patient.last_name);

    // Step 2: Login as doctor
    console.log('\n2. Logging in as doctor...');
    const doctorLoginResponse = await axios.post(`${BASE_URL}/login`, {
      email: 'doctor@test.com', // Replace with actual doctor user
      password: 'password123'
    });

    if (!doctorLoginResponse.data.success) {
      console.error('Doctor login failed:', doctorLoginResponse.data.message);
      return;
    }

    const doctorToken = doctorLoginResponse.data.data.token;
    const doctor = doctorLoginResponse.data.data.user;
    console.log('✅ Doctor logged in:', doctor.first_name, doctor.last_name);

    // Step 3: Create a new session as patient
    console.log('\n3. Creating new text session...');
    axios.defaults.headers.common['Authorization'] = `Bearer ${patientToken}`;
    
    const createSessionResponse = await axios.post(`${BASE_URL}/text-sessions`, {
      doctor_id: doctor.id
    });

    if (!createSessionResponse.data.success) {
      console.error('Failed to create session:', createSessionResponse.data.message);
      return;
    }

    const sessionId = createSessionResponse.data.data.session_id;
    console.log('✅ Created session:', sessionId);

    // Step 4: Send message as patient
    console.log('\n4. Sending message as patient...');
    const patientMessage = 'Hello doctor! This is a test message from patient.';
    console.log('Patient message:', patientMessage);

    const patientSendResponse = await axios.post(`${BASE_URL}/text-sessions/${sessionId}/messages`, {
      text: patientMessage,
      sender: patient.id.toString()
    });

    if (!patientSendResponse.data.success) {
      console.error('Failed to send patient message:', patientSendResponse.data.message);
      return;
    }

    console.log('✅ Patient message sent successfully');
    console.log('Message ID:', patientSendResponse.data.data.id);

    // Step 5: Switch to doctor and check for messages
    console.log('\n5. Switching to doctor and checking messages...');
    axios.defaults.headers.common['Authorization'] = `Bearer ${doctorToken}`;
    
    // Wait a moment for message to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get messages as doctor
    const doctorMessagesResponse = await axios.get(`${BASE_URL}/text-sessions/${sessionId}/messages`);
    
    if (!doctorMessagesResponse.data.success) {
      console.error('Failed to get messages as doctor:', doctorMessagesResponse.data.message);
      return;
    }

    const messages = doctorMessagesResponse.data.data;
    console.log(`✅ Doctor received ${messages.length} messages`);

    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      console.log('Last message:', lastMessage.text);
      console.log('Message matches:', lastMessage.text === patientMessage);
    }

    // Step 6: Send reply as doctor
    console.log('\n6. Sending reply as doctor...');
    const doctorMessage = 'Hello patient! This is a reply from the doctor.';
    console.log('Doctor message:', doctorMessage);

    const doctorSendResponse = await axios.post(`${BASE_URL}/text-sessions/${sessionId}/messages`, {
      text: doctorMessage,
      sender: doctor.id.toString()
    });

    if (!doctorSendResponse.data.success) {
      console.error('Failed to send doctor message:', doctorSendResponse.data.message);
      return;
    }

    console.log('✅ Doctor message sent successfully');
    console.log('Message ID:', doctorSendResponse.data.data.id);

    // Step 7: Switch back to patient and check for reply
    console.log('\n7. Switching back to patient and checking reply...');
    axios.defaults.headers.common['Authorization'] = `Bearer ${patientToken}`;
    
    // Wait a moment for message to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get messages as patient
    const patientMessagesResponse = await axios.get(`${BASE_URL}/text-sessions/${sessionId}/messages`);
    
    if (!patientMessagesResponse.data.success) {
      console.error('Failed to get messages as patient:', patientMessagesResponse.data.message);
      return;
    }

    const patientMessages = patientMessagesResponse.data.data;
    console.log(`✅ Patient received ${patientMessages.length} messages`);

    if (patientMessages.length >= 2) {
      const lastMessage = patientMessages[patientMessages.length - 1];
      console.log('Last message:', lastMessage.text);
      console.log('Message matches:', lastMessage.text === doctorMessage);
    }

    // Step 8: Test local storage sync
    console.log('\n8. Testing local storage sync...');
    const localStorageResponse = await axios.get(`${BASE_URL}/text-sessions/${sessionId}/local-storage`);
    
    if (localStorageResponse.data.success) {
      const localData = localStorageResponse.data.data;
      console.log(`✅ Local storage has ${localData.messages.length} messages`);
      console.log('Encryption key exists:', !!localData.encryption_key);
      console.log('Session metadata exists:', !!localData.session_metadata);
    }

    console.log('\n✅ Real-time message test completed successfully!');
    console.log('Messages are being sent and received properly.');

  } catch (error) {
    console.error('\n❌ Real-time test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

testRealtimeMessages(); 